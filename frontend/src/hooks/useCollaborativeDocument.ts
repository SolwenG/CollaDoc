import type {
    ClientToServerEvents,
    DocumentRole,
    JoinResponse,
    Operation,
    OutgoingOperation,
    ServerOperation,
    ServerToClientEvents,
} from '@shared/ot'
import { CollabClient, apply, diff, transformIndex } from '@shared/ot'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import type { Ref } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export type ConnectionStatus = 'connecting' | 'online' | 'offline' | 'closed'

const CLOSED_MESSAGES = {
    NOT_FOUND: 'Document introuvable ou non partagé avec vous.',
    FORBIDDEN: "Vous n'avez pas accès à ce document.",
    DELETED: 'Ce document a été supprimé.',
    ACCESS_REVOKED: 'Votre accès à ce document a été retiré.',
    UNAUTHENTICATED: 'Votre session a expiré, reconnectez-vous.',
} as const

export function useCollaborativeDocument(
    documentId: number,
    textarea: Ref<HTMLTextAreaElement | null>
) {
    const status = ref<ConnectionStatus>('connecting')
    const role = ref<DocumentRole | null>(null)
    const closedMessage = ref<string | null>(null)
    // Local text the server could not take, shown so the user can copy it back
    const lostText = ref<string | null>(null)
    const ready = ref(false)

    const readonly = computed(
        () =>
            !ready.value || role.value === 'VIEWER' || status.value === 'closed'
    )

    let text = ''
    let client: CollabClient | null = null
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
        autoConnect: false,
    })

    function render() {
        if (textarea.value && textarea.value.value !== text)
            textarea.value.value = text
    }

    function send(outgoing: OutgoingOperation | null) {
        if (outgoing) socket.emit('operation', { documentId, ...outgoing })
    }

    function applyRemote(operation: Operation) {
        const element = textarea.value
        text = apply(text, operation)
        if (!element) return
        const { selectionStart, selectionEnd, selectionDirection } = element
        element.value = text
        element.setSelectionRange(
            transformIndex(operation, selectionStart),
            transformIndex(operation, selectionEnd),
            selectionDirection
        )
    }

    function receive(message: ServerOperation) {
        if (!client) return
        const { toApply, toSend } = client.receive(message)
        if (toApply) applyRemote(toApply)
        send(toSend)
    }

    function reload(keepLocalText: boolean) {
        if (keepLocalText && client?.outgoing()) lostText.value = text
        client = null
        ready.value = false
        void join()
    }

    function onJoined(response: JoinResponse) {
        if (!response.ok) {
            if (response.reason === 'TOO_OLD') return reload(true)
            status.value = 'closed'
            closedMessage.value = CLOSED_MESSAGES[response.reason]
            return
        }
        role.value = response.role
        if ('text' in response) {
            if (client?.outgoing()) lostText.value = text
            text = response.text
            client = new CollabClient(response.revision, () =>
                crypto.randomUUID()
            )
            render()
        } else if (client) {
            for (const message of response.missed) receive(message)
            send(client.outgoing())
        }
        ready.value = true
        status.value = 'online'
    }

    async function join() {
        const response = await socket.emitWithAck('document:join', {
            documentId,
            ...(client && { revision: client.revision }),
        })
        onJoined(response)
    }

    socket.on('connect', () => void join())
    socket.on('disconnect', (reason) => {
        if (status.value === 'closed') return
        // Kicked by the server (logout, blocked account): socket.io will not reconnect
        if (reason === 'io server disconnect') {
            status.value = 'closed'
            closedMessage.value = CLOSED_MESSAGES.UNAUTHENTICATED
        } else {
            status.value = 'offline'
        }
    })
    socket.on('connect_error', () => {
        // Refused by the server's authentication: no automatic retry
        if (!socket.active) {
            status.value = 'closed'
            closedMessage.value = CLOSED_MESSAGES.UNAUTHENTICATED
        }
    })
    socket.on('operation:ack', (message) => {
        if (message.documentId === documentId && client) {
            send(client.acknowledge(message.opId, message.revision))
        }
    })
    socket.on('operation:remote', (message) => {
        if (message.documentId === documentId) receive(message)
    })
    socket.on('operation:rejected', (message) => {
        if (message.documentId === documentId) reload(true)
    })
    socket.on('document:closed', (message) => {
        if (message.documentId !== documentId) return
        status.value = 'closed'
        closedMessage.value = CLOSED_MESSAGES[message.reason]
        socket.disconnect()
    })

    function onInput() {
        const element = textarea.value
        if (!element || !client || readonly.value) return
        const operation = diff(text, element.value)
        text = element.value
        send(client.applyLocal(operation))
    }

    // The browser's undo history breaks as soon as remote edits change the text
    function onBeforeInput(event: InputEvent) {
        if (
            event.inputType === 'historyUndo' ||
            event.inputType === 'historyRedo'
        ) {
            event.preventDefault()
        }
    }

    function onKeydown(event: KeyboardEvent) {
        const key = event.key.toLowerCase()
        if ((event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y'))
            event.preventDefault()
    }

    watch(textarea, render)
    onMounted(() => socket.connect())
    onBeforeUnmount(() => socket.disconnect())

    return {
        status,
        role,
        readonly,
        closedMessage,
        lostText,
        onInput,
        onBeforeInput,
        onKeydown,
    }
}
