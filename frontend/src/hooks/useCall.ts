import {ref, readonly} from 'vue';
import {socket} from '@/services/socket';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected';

export interface IncomingCall {
  callId: string;
  documentId: number;
  from: { id: number; displayName: string };
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    {urls: 'stun:stun.l.google.com:19302'},
    // TURN en prod
  ],
};

// ---- État partagé ----
const status = ref<CallStatus>('idle');
const incoming = ref<IncomingCall | null>(null);
const muted = ref(false);
const error = ref<string | null>(null);
// Raison de la dernière fin d'appel (pour afficher une notification)
const lastEnd = ref<{ reason: string; at: number } | null>(null);

let callId: string | null = null;
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteAudio: HTMLAudioElement | null = null;
let pendingCandidates: RTCIceCandidateInit[] = [];
let initialized = false;

async function getMic() {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true},
  });
}

function createPeer() {
  const peer = new RTCPeerConnection(ICE_SERVERS);
  pc = peer;
  localStream?.getTracks().forEach((t) => peer.addTrack(t, localStream!));

  peer.onicecandidate = (e) => {
    if (e.candidate && callId) {
      socket.emit('call:signal', {callId, candidate: e.candidate.toJSON()});
    }
  };
  peer.ontrack = (e) => {
    remoteAudio ??= new Audio();
    remoteAudio.autoplay = true;
    remoteAudio.srcObject = e.streams[0] ?? null;
  };
  peer.onconnectionstatechange = () => {
    if (peer.connectionState === 'connected') status.value = 'connected';
    if (peer.connectionState === 'failed') {
      error.value = 'connection_failed';
      hangup();
    }
  };
}

function cleanup() {
  pc?.close();
  pc = null;
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  if (remoteAudio) remoteAudio.srcObject = null;
  pendingCandidates = [];
  callId = null;
  incoming.value = null;
  muted.value = false;
  status.value = 'idle';
}

// ---- Actions ----
async function startCall(documentId: number, targetUserId: number) {
  if (status.value !== 'idle') return;
  error.value = null;
  try {
    await getMic();
  } catch {
    error.value = 'mic_denied';
    return;
  }
  status.value = 'calling';
  socket.emit(
    'call:invite',
    {documentId, targetUserId},
    (res: { ok: boolean; callId?: string; error?: string }) => {
      if (!res.ok) {
        error.value = res.error ?? 'server_error';
        cleanup();
        return;
      }
      callId = res.callId!;
    },
  );
}

async function acceptCall() {
  if (!incoming.value) return;
  const id = incoming.value.callId;
  try {
    await getMic();
  } catch {
    error.value = 'mic_denied';
    declineCall();
    return;
  }
  callId = id;
  status.value = 'connecting';
  createPeer();
  socket.emit('call:accept', {callId: id});
}

function declineCall() {
  if (incoming.value) socket.emit('call:hangup', {callId: incoming.value.callId});
  cleanup();
}

function hangup() {
  if (callId) socket.emit('call:hangup', {callId});
  cleanup();
}

function toggleMute() {
  muted.value = !muted.value;
  localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted.value));
}

// ---- Listeners (enregistrés une seule fois) ----
function init() {
  if (initialized) return;
  initialized = true;

  socket.on('call:incoming', (data: IncomingCall) => {
    if (status.value !== 'idle') return; // le serveur gère déjà "occupé"
    incoming.value = data;
    status.value = 'ringing';
  });

  socket.on('call:accepted', async ({callId: id}: { callId: string }) => {
    if (id !== callId) return;
    status.value = 'connecting';
    createPeer();
    const offer = await pc!.createOffer();
    await pc!.setLocalDescription(offer);
    socket.emit('call:signal', {callId, description: pc!.localDescription});
  });

  socket.on(
    'call:signal',
    async (p: { callId: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
      if (p.callId !== callId || !pc) return;
      try {
        if (p.description) {
          await pc.setRemoteDescription(p.description);
          // Candidats reçus avant la description : on les applique maintenant
          for (const c of pendingCandidates) await pc.addIceCandidate(c).catch(() => {
          });
          pendingCandidates = [];
          if (p.description.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('call:signal', {callId, description: pc.localDescription});
          }
        } else if (p.candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(p.candidate).catch(() => {
          });
          else pendingCandidates.push(p.candidate);
        }
      } catch {
        error.value = 'connection_failed';
        hangup();
      }
    },
  );

  socket.on('call:ended', ({callId: id, reason}: { callId: string; reason: string }) => {
    if (id !== callId && id !== incoming.value?.callId) return;
    lastEnd.value = {reason, at: Date.now()};
    cleanup();
  });
}

export function useCall() {
  init();
  return {
    status: readonly(status),
    incoming: readonly(incoming),
    muted: readonly(muted),
    error,
    lastEnd: readonly(lastEnd),
    startCall,
    acceptCall,
    declineCall,
    hangup,
    toggleMute,
  };
}
