import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  Maximize,
  Minimize,
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

/* ──────── sound helpers (Web Audio API — no files needed) ──────── */

let audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine') {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.15;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playOnSound()  { playTone(880, 0.12); setTimeout(() => playTone(1174, 0.12), 80); }
function playOffSound() { playTone(784, 0.12); setTimeout(() => playTone(523, 0.12), 80); }
function playScreenShareStart() { playTone(660, 0.1); setTimeout(() => playTone(880, 0.1), 70); setTimeout(() => playTone(1100, 0.15), 140); }
function playScreenShareStop()  { playTone(880, 0.1); setTimeout(() => playTone(660, 0.1), 70); setTimeout(() => playTone(440, 0.15), 140); }

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface VideoRoomProps {
  roomId: string;
  onLeave: () => void;
}

export default function VideoRoom({ roomId, onLeave }: VideoRoomProps) {
  const { token, user } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteScreenRef = useRef<HTMLVideoElement>(null);
  const screenContainerRef = useRef<HTMLDivElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenSenderRef = useRef<RTCRtpSender | null>(null);
  const makingOfferRef = useRef(false);



  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>('connecting');

  /* ──────── helpers ──────── */

  const createPeerConnection = useCallback(
    (targetUserId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('iceCandidate', {
            roomId,
            targetUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (!stream) return;

        // First stream we receive is always the webcam
        const currentWebcam = remoteVideoRef.current?.srcObject as MediaStream | null;
        if (!currentWebcam) {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          return;
        }

        // Same stream as webcam — just a track update, already assigned
        if (stream.id === currentWebcam.id) {
          return;
        }

        // Different stream → screen share (auto-detected, no socket race)
        if (remoteScreenRef.current) {
          remoteScreenRef.current.srcObject = stream;
        }
        setRemoteScreenSharing(true);
      };

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
      };

      // Handle renegotiation (needed when adding/removing screen share track)
      pc.onnegotiationneeded = async () => {
        if (makingOfferRef.current) return;
        try {
          makingOfferRef.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit('offer', {
            roomId,
            targetUserId,
            sdp: pc.localDescription,
          });
        } finally {
          makingOfferRef.current = false;
        }
      };

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pcRef.current = pc;
      return pc;
    },
    [roomId],
  );

  /* ──────── main effect ──────── */

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1. Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Connect to signaling server
      const socket = io(`${SOCKET_URL}/webrtc`, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('joinRoom', { roomId });
      });

      // Another user is already in the room → we are the caller
      socket.on('roomUsers', async ({ users }: { users: string[] }) => {
        if (!mounted || users.length === 0) return;

        const target = users[0]; // 1-on-1 call
        setRemoteUserId(target);

        const pc = createPeerConnection(target);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('offer', {
          roomId,
          targetUserId: target,
          sdp: pc.localDescription,
        });
      });

      // A new user joined → we wait for their offer
      socket.on('userJoined', ({ userId }: { userId: string }) => {
        if (!mounted) return;
        setRemoteUserId(userId);
        setConnectionState('connecting');
      });

      // Receive offer → create answer
      socket.on(
        'offer',
        async ({
          sdp,
          senderId,
        }: {
          sdp: RTCSessionDescriptionInit;
          senderId: string;
        }) => {
          if (!mounted) return;

          let pc = pcRef.current;
          if (!pc) {
            setRemoteUserId(senderId);
            pc = createPeerConnection(senderId);
          }

          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('answer', {
            roomId,
            targetUserId: senderId,
            sdp: pc.localDescription,
          });
        },
      );

      // Receive answer
      socket.on(
        'answer',
        async ({
          sdp,
        }: {
          sdp: RTCSessionDescriptionInit;
          senderId: string;
        }) => {
          if (!mounted) return;
          await pcRef.current?.setRemoteDescription(
            new RTCSessionDescription(sdp),
          );
        },
      );

      // ICE candidate
      socket.on(
        'iceCandidate',
        async ({
          candidate,
        }: {
          candidate: RTCIceCandidateInit;
          senderId: string;
        }) => {
          if (!mounted) return;
          try {
            await pcRef.current?.addIceCandidate(
              new RTCIceCandidate(candidate),
            );
          } catch (err) {
            console.error('Failed to add ICE candidate', err);
          }
        },
      );

      // Screen share signals from remote
      socket.on('screenShareStarted', () => {
        if (!mounted) return;
        playScreenShareStart();
      });

      socket.on('screenShareStopped', () => {
        if (!mounted) return;
        setRemoteScreenSharing(false);
        if (remoteScreenRef.current) {
          remoteScreenRef.current.srcObject = null;
        }
        playScreenShareStop();
      });

      // Remote user left
      socket.on('userLeft', () => {
        if (!mounted) return;
        setRemoteUserId(null);
        setRemoteScreenSharing(false);
        setConnectionState('disconnected');
        pcRef.current?.close();
        pcRef.current = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (remoteScreenRef.current) remoteScreenRef.current.srcObject = null;
      });
    };

    init().catch(console.error);

    return () => {
      mounted = false;
      socketRef.current?.emit('leaveRoom', { roomId });
      socketRef.current?.disconnect();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenSenderRef.current?.track?.stop();
      // Release video elements so browser turns off camera light
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteScreenRef.current) remoteScreenRef.current.srcObject = null;
    };
  }, [roomId, token, createPeerConnection]);

  /* ──────── fullscreen listener ──────── */

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  /* ──────── controls ──────── */

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      audioTrack.enabled ? playOnSound() : playOffSound();
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
      videoTrack.enabled ? playOnSound() : playOffSound();
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (isScreenSharing) {
      // Stop screen sharing — remove the screen track from PC
      if (screenSenderRef.current) {
        pcRef.current.removeTrack(screenSenderRef.current);
        screenSenderRef.current.track?.stop();
        screenSenderRef.current = null;
      }
      socketRef.current?.emit('screenShareStopped', { roomId });
      setIsScreenSharing(false);
      playScreenShareStop();
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Add screen track as a NEW track (keeps webcam track intact)
        const sender = pcRef.current.addTrack(screenTrack, screenStream);
        screenSenderRef.current = sender;

        socketRef.current?.emit('screenShareStarted', { roomId });
        setIsScreenSharing(true);
        playScreenShareStart();

        // When user stops via browser UI
        screenTrack.onended = () => {
          if (pcRef.current && screenSenderRef.current) {
            pcRef.current.removeTrack(screenSenderRef.current);
            screenSenderRef.current = null;
          }
          socketRef.current?.emit('screenShareStopped', { roomId });
          setIsScreenSharing(false);
          playScreenShareStop();
        };
      } catch {
        // User cancelled the screen picker
      }
    }
  };

  const toggleFullscreen = async () => {
    if (!screenContainerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await screenContainerRef.current.requestFullscreen();
    }
  };

  const handleLeave = () => {
    socketRef.current?.emit('leaveRoom', { roomId });
    socketRef.current?.disconnect();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenSenderRef.current?.track?.stop();
    // Release video elements so browser turns off camera light
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteScreenRef.current) remoteScreenRef.current.srcObject = null;
    onLeave();
  };

  /* ──────── UI ──────── */

  const statusLabel =
    connectionState === 'connected'
      ? 'Connected'
      : connectionState === 'connecting'
        ? remoteUserId
          ? 'Connecting...'
          : 'Waiting for other participant...'
        : connectionState === 'disconnected'
          ? 'Disconnected'
          : connectionState;

  const showScreenView = remoteScreenSharing;

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Status bar */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connectionState === 'connected'
                ? 'bg-green-500'
                : connectionState === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-300">{statusLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          {isScreenSharing && (
            <span className="flex items-center gap-1 text-xs text-indigo-400">
              <MonitorUp className="h-3.5 w-3.5" /> Sharing your screen
            </span>
          )}
          <span className="text-xs text-gray-500">
            Room: {roomId.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* Video area */}
      <div className="relative flex flex-1 overflow-hidden">
        {showScreenView ? (
          /* ── Screen share layout: screen main + webcams sidebar ── */
          <>
            {/* Screen share — main area */}
            <div
              ref={screenContainerRef}
              className="relative flex flex-1 items-center justify-center bg-black p-2"
            >
              <video
                ref={remoteScreenRef}
                autoPlay
                playsInline
                className="max-h-full max-w-full rounded-xl object-contain"
              />
              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                className="absolute top-3 right-3 rounded-lg bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Sidebar: remote webcam + local webcam */}
            <div className="flex w-52 flex-col gap-2 bg-gray-800 p-2">
              {/* Remote webcam */}
              <div className="relative overflow-hidden rounded-lg border border-gray-700">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full bg-gray-900 object-cover"
                />
                <div className="absolute bottom-1 left-2 text-xs text-white/80">
                  Participant
                </div>
              </div>
              {/* Local webcam */}
              <div className="relative overflow-hidden rounded-lg border border-gray-700">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full bg-gray-900 object-cover"
                />
                <div className="absolute bottom-1 left-2 text-xs text-white/80">
                  {user?.firstName ?? 'You'}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ── Normal layout: remote full + local PIP ── */
          <div className="relative flex flex-1 items-center justify-center p-4">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="max-h-full max-w-full rounded-2xl bg-gray-800 object-cover"
            />

            {!remoteUserId && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                  <p className="text-lg text-gray-400">
                    Waiting for other participant to join...
                  </p>
                </div>
              </div>
            )}

            {/* Local video (PIP) */}
            <div className="absolute bottom-6 right-6 w-48 overflow-hidden rounded-xl border-2 border-gray-700 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full bg-gray-800 object-cover"
              />
              <div className="absolute bottom-1 left-2 text-xs text-white/80">
                {user?.firstName ?? 'You'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 bg-gray-800 py-4">
        <button
          onClick={toggleMute}
          className={`rounded-full p-3 transition-colors ${
            isMuted
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <button
          onClick={toggleCamera}
          className={`rounded-full p-3 transition-colors ${
            isCameraOff
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
          title={isCameraOff ? 'Turn On Camera' : 'Turn Off Camera'}
        >
          {isCameraOff ? (
            <VideoOff className="h-5 w-5" />
          ) : (
            <Video className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`rounded-full p-3 transition-colors ${
            isScreenSharing
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
          title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        >
          <MonitorUp className="h-5 w-5" />
        </button>

        <button
          onClick={handleLeave}
          className="rounded-full bg-red-600 p-3 text-white hover:bg-red-700"
          title="Leave Call"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
