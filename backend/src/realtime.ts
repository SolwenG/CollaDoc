import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { errorHandler } from './middlewares/errors.middleware.ts'
import { registerCollaborationHandlers } from './realtime/collaboration.handlers.ts'
import { runInOrder } from './realtime/document-queue.ts'
import { internalRoutes } from './realtime/internal.routes.ts'
import {
    getOpenDocument,
    listOpenDocuments,
    writeSnapshot,
} from './realtime/open-documents.ts'
import { authenticateSocket } from './realtime/socket-auth.ts'
import type { CollabServer } from './realtime/socket.types.ts'
import { userRoom } from './realtime/socket.types.ts'

const SNAPSHOT_INTERVAL_MS = 10_000

const app = express()
const httpServer = createServer(app)
const io: CollabServer = new Server(httpServer, { serveClient: false })

app.use(express.json())
app.use('/internal', internalRoutes(io))
app.use(errorHandler)

io.use(authenticateSocket)
io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.userId))
    registerCollaborationHandlers(socket)
})

function snapshotAll(): Promise<void[]> {
    return Promise.all(
        listOpenDocuments().map((document) =>
            runInOrder(document.id, async () => {
                const current = getOpenDocument(document.id)
                if (current) await writeSnapshot(current)
            }).catch(console.error)
        )
    )
}

const snapshotTimer = setInterval(snapshotAll, SNAPSHOT_INTERVAL_MS)

async function shutdown() {
    clearInterval(snapshotTimer)
    io.close()
    await snapshotAll()
    process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

const port = process.env['REALTIME_PORT'] ?? '3001'
httpServer.listen(port, () =>
    console.log(`✅ Realtime server is running on port ${port}`)
)
