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
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

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

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
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
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
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
          setRemoteUserId(senderId);

          const pc = createPeerConnection(senderId);
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

      // Remote user left
      socket.on('userLeft', () => {
        if (!mounted) return;
        setRemoteUserId(null);
        setConnectionState('disconnected');
        pcRef.current?.close();
        pcRef.current = null;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      });
    };

    init().catch(console.error);

    return () => {
      mounted = false;
      socketRef.current?.emit('leaveRoom', { roomId });
      socketRef.current?.disconnect();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId, token, createPeerConnection]);

  /* ──────── controls ──────── */

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (isScreenSharing) {
      // Switch back to camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(videoTrack);

      // Update local preview
      const oldTrack = localStreamRef.current?.getVideoTracks()[0];
      if (oldTrack) oldTrack.stop();
      localStreamRef.current?.removeTrack(oldTrack!);
      localStreamRef.current?.addTrack(videoTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      // Screen share
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = stream.getVideoTracks()[0];
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);

      // When user stops sharing via browser UI
      screenTrack.onended = () => {
        toggleScreenShare();
      };

      // Update local preview
      const oldTrack = localStreamRef.current?.getVideoTracks()[0];
      if (oldTrack) oldTrack.stop();
      localStreamRef.current?.removeTrack(oldTrack!);
      localStreamRef.current?.addTrack(screenTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(true);
    }
  };

  const handleLeave = () => {
    socketRef.current?.emit('leaveRoom', { roomId });
    socketRef.current?.disconnect();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
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
        <span className="text-xs text-gray-500">
          Room: {roomId.slice(0, 8)}...
        </span>
      </div>

      {/* Video area */}
      <div className="relative flex flex-1 items-center justify-center p-4">
        {/* Remote video (full) */}
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
