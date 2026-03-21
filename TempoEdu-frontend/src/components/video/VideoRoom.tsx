import { useEffect, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../common/BrandLogo';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  Maximize,
  Minimize,
  Clock3,
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

function parseIceUrls(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildIceConfig(): RTCConfiguration {
  const stunUrls = parseIceUrls(import.meta.env.VITE_STUN_URLS) || [];
  const turnUrls = parseIceUrls(import.meta.env.VITE_TURN_URLS) || [];
  const turnUsername = import.meta.env.VITE_TURN_USERNAME || '';
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL || '';
  const forceRelay = import.meta.env.VITE_FORCE_TURN_RELAY === 'true';

  const defaultStuns = ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'];

  const iceServers: RTCIceServer[] = [];
  const effectiveStunUrls = stunUrls.length > 0 ? stunUrls : defaultStuns;
  if (effectiveStunUrls.length > 0) {
    iceServers.push({ urls: effectiveStunUrls });
  }

  if (turnUrls.length > 0) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return {
    iceServers,
    iceTransportPolicy: forceRelay ? 'relay' : 'all',
  };
}

function getUserIdFromToken(token: string | null): string {
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || '')) as {
      sub?: string;
    };
    return payload.sub || '';
  } catch {
    return '';
  }
}

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

const ICE_SERVERS: RTCConfiguration = buildIceConfig();

interface VideoRoomProps {
  roomId: string;
  onLeave: () => void;
}

export default function VideoRoom({ roomId, onLeave }: VideoRoomProps) {
  const { token, user } = useAuth();
  const myUserId = user?._id || getUserIdFromToken(token);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteScreenRef = useRef<HTMLVideoElement>(null);
  const screenContainerRef = useRef<HTMLDivElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenSenderRef = useRef<RTCRtpSender | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const remoteVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteScreenTrackRef = useRef<MediaStreamTrack | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const isSettingRemoteAnswerPendingRef = useRef(false);
  const politePeerRef = useRef(false);



  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>('connecting');
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [focusedTile, setFocusedTile] = useState<'remote' | 'local' | 'screen'>(
    'remote',
  );
  const [dockPosition, setDockPosition] = useState({ x: 24, y: 24 });
  const [isDraggingDock, setIsDraggingDock] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const shouldInitiateOffer = useCallback(
    (targetUserId: string) => {
      if (!myUserId || !targetUserId) return false;
      return myUserId < targetUserId;
    },
    [myUserId],
  );

  const startOffer = useCallback(
    async (
      targetUserId: string,
      options?: { iceRestart?: boolean; force?: boolean },
    ) => {
      if (!targetUserId || targetUserId === myUserId) return;
      const pc = pcRef.current;
      if (!pc || makingOfferRef.current || pc.signalingState !== 'stable') return;

      const isInitialNegotiation = !pc.remoteDescription;
      const force = options?.force === true;
      if (isInitialNegotiation && !force && !shouldInitiateOffer(targetUserId)) {
        return;
      }

      try {
        makingOfferRef.current = true;
        await pc.setLocalDescription(
          await pc.createOffer({ iceRestart: options?.iceRestart === true }),
        );
        socketRef.current?.emit('offer', {
          roomId,
          targetUserId,
          sdp: pc.localDescription,
        });
      } finally {
        makingOfferRef.current = false;
      }
    },
    [myUserId, roomId, shouldInitiateOffer],
  );

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
        if (event.track.kind !== 'video') return;

        const stream = event.streams[0] ?? new MediaStream([event.track]);
        if (!remoteVideoTrackRef.current) {
          remoteVideoTrackRef.current = event.track;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }

          event.track.onended = () => {
            if (remoteVideoTrackRef.current?.id !== event.track.id) return;
            remoteVideoTrackRef.current = null;
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
          };
          return;
        }

        if (remoteVideoTrackRef.current.id === event.track.id) {
          return;
        }

        remoteScreenTrackRef.current = event.track;
        if (remoteScreenRef.current) {
          remoteScreenRef.current.srcObject = stream;
        }
        setRemoteScreenSharing(true);

        event.track.onended = () => {
          if (remoteScreenTrackRef.current?.id !== event.track.id) return;
          remoteScreenTrackRef.current = null;
          setRemoteScreenSharing(false);
          if (remoteScreenRef.current) {
            remoteScreenRef.current.srcObject = null;
          }
        };
      };

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
      };

      pc.oniceconnectionstatechange = async () => {
        if (pc.iceConnectionState !== 'failed') return;
        const targetId = remoteUserIdRef.current ?? targetUserId;
        if (!targetId || makingOfferRef.current) return;

        await startOffer(targetId, { iceRestart: true, force: true });
      };

      // Handle renegotiation (needed when adding/removing screen share track)
      pc.onnegotiationneeded = async () => {
        if (makingOfferRef.current || pc.signalingState !== 'stable') return;
        const targetId = remoteUserIdRef.current ?? targetUserId;
        if (!targetId) return;
        await startOffer(targetId);
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
    [roomId, startOffer],
  );

  useEffect(() => {
    remoteUserIdRef.current = remoteUserId;
  }, [remoteUserId]);

  useEffect(() => {
    if (!remoteScreenSharing && focusedTile === 'screen') {
      setFocusedTile('remote');
    }
  }, [focusedTile, remoteScreenSharing]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!isDraggingDock) return;
      const nextX = Math.max(12, window.innerWidth - event.clientX - dragOffsetRef.current.x);
      const nextY = Math.max(12, window.innerHeight - event.clientY - dragOffsetRef.current.y - 96);
      setDockPosition({ x: nextX, y: nextY });
    };

    const onUp = () => {
      setIsDraggingDock(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingDock]);

  /* ──────── main effect ──────── */

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!token) {
        setConnectionState('disconnected');
        setMediaError('Session expired. Please log in again, then rejoin the call.');
        return;
      }

      // 1. Try to get local media, but do not block signaling if it fails.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setMediaError(null);
      } catch (error) {
        localStreamRef.current = new MediaStream();
        const notSecureContext = !window.isSecureContext;
        setMediaError(
          notSecureContext
            ? 'Camera/mic are blocked on non-secure pages. Open the call on HTTPS.'
            : 'Could not access camera/mic. Check browser permissions and try again.',
        );
        console.error('Failed to initialize local media', error);
      }

      // 2. Connect to signaling server
      const socket = io(`${SOCKET_URL}/chat`, {
        auth: { token },
        query: { token },
        extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      socket.on('connect_error', (error) => {
        if (!mounted) return;
        setConnectionState('disconnected');
        setMediaError(`Signaling connection failed: ${error.message}`);
        console.error('WebRTC socket connect_error', error);
      });

      socket.on('disconnect', (reason) => {
        if (!mounted) return;
        if (reason !== 'io client disconnect') {
          setConnectionState('disconnected');
        }
      });

      socket.on('connect', () => {
        setMediaError((current) =>
          current?.startsWith('Signaling connection failed') ? null : current,
        );
        socket.emit('joinRoom', { roomId });
      });

      // Another user is already in the room → we are the caller
      socket.on('roomUsers', ({ users }: { users: string[] }) => {
        if (!mounted || users.length === 0) return;

        const target = users.find((id) => id !== myUserId);
        if (!target) return;
        setRemoteUserId(target);
        remoteUserIdRef.current = target;
        politePeerRef.current = myUserId > target;

        if (!pcRef.current) {
          createPeerConnection(target);
        }

        // Force initial offer to avoid waiting state if onnegotiationneeded is missed.
        void startOffer(target);
      });

      // A new user joined → we wait for their offer
      socket.on('userJoined', ({ userId }: { userId: string }) => {
        if (!mounted) return;
        if (userId === myUserId) return;
        setRemoteUserId(userId);
        remoteUserIdRef.current = userId;
        politePeerRef.current = myUserId > userId;
        setConnectionState('connecting');

        if (!pcRef.current) {
          createPeerConnection(userId);
        }

        // Also try offering from existing participant to avoid deadlocks.
        void startOffer(userId);
      });

      socket.on(
        'roomState',
        ({ users }: { roomId: string; users: string[] }) => {
          if (!mounted) return;

          if (!myUserId) return;
          const peerId = users.find((id) => id !== myUserId) ?? null;

          if (!peerId) {
            setRemoteUserId(null);
            remoteUserIdRef.current = null;
            return;
          }

          if (remoteUserIdRef.current !== peerId) {
            setRemoteUserId(peerId);
            remoteUserIdRef.current = peerId;
          }

          politePeerRef.current = myUserId > peerId;
          setConnectionState('connecting');

          if (!pcRef.current) {
            createPeerConnection(peerId);
          }

          void startOffer(peerId);
        },
      );

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
            remoteUserIdRef.current = senderId;
            politePeerRef.current = (user?._id ?? '') > senderId;
            pc = createPeerConnection(senderId);
          }

          const readyForOffer =
            !makingOfferRef.current &&
            (pc.signalingState === 'stable' ||
              isSettingRemoteAnswerPendingRef.current);
          const offerCollision = !readyForOffer;

          ignoreOfferRef.current = !politePeerRef.current && offerCollision;
          if (ignoreOfferRef.current) {
            return;
          }

          isSettingRemoteAnswerPendingRef.current = sdp.type === 'answer';

          if (offerCollision) {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(new RTCSessionDescription(sdp)),
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          }
          isSettingRemoteAnswerPendingRef.current = false;

          if (pendingIceCandidatesRef.current.length > 0) {
            for (const pending of pendingIceCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(pending));
            }
            pendingIceCandidatesRef.current = [];
          }

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
          if (ignoreOfferRef.current) return;
          isSettingRemoteAnswerPendingRef.current = true;
          await pcRef.current?.setRemoteDescription(
            new RTCSessionDescription(sdp),
          );

          if (pcRef.current && pendingIceCandidatesRef.current.length > 0) {
            for (const pending of pendingIceCandidatesRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(pending));
            }
            pendingIceCandidatesRef.current = [];
          }

          isSettingRemoteAnswerPendingRef.current = false;
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
            const pc = pcRef.current;
            if (!pc) return;

            if (!pc.remoteDescription) {
              pendingIceCandidatesRef.current.push(candidate);
              return;
            }

            await pc.addIceCandidate(new RTCIceCandidate(candidate));
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
        remoteScreenTrackRef.current = null;
        if (remoteScreenRef.current) {
          remoteScreenRef.current.srcObject = null;
        }
        playScreenShareStop();
      });

      // Remote user left
      socket.on('userLeft', () => {
        if (!mounted) return;
        setRemoteUserId(null);
        remoteUserIdRef.current = null;
        setRemoteScreenSharing(false);
        remoteVideoTrackRef.current = null;
        remoteScreenTrackRef.current = null;
        pendingIceCandidatesRef.current = [];
        ignoreOfferRef.current = false;
        isSettingRemoteAnswerPendingRef.current = false;
        politePeerRef.current = false;
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
      remoteUserIdRef.current = null;
      remoteVideoTrackRef.current = null;
      remoteScreenTrackRef.current = null;
      pendingIceCandidatesRef.current = [];
      // Release video elements so browser turns off camera light
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteScreenRef.current) remoteScreenRef.current.srcObject = null;
    };
  }, [myUserId, roomId, token, createPeerConnection, startOffer]);

  /* ──────── fullscreen listener ──────── */

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    if (connectionState !== 'connected') {
      if (!remoteUserId) {
        setCallStartedAt(null);
        setCallDurationSec(0);
      }
      return;
    }

    const startAt = callStartedAt ?? Date.now();
    if (!callStartedAt) {
      setCallStartedAt(startAt);
    }

    const updateDuration = () => {
      setCallDurationSec(Math.floor((Date.now() - startAt) / 1000));
    };

    updateDuration();
    const intervalId = window.setInterval(updateDuration, 1000);
    return () => window.clearInterval(intervalId);
  }, [connectionState, callStartedAt, remoteUserId]);

  // Rebind video elements after layout switches so streams do not disappear.
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

    if (remoteVideoRef.current && remoteVideoTrackRef.current) {
      remoteVideoRef.current.srcObject = new MediaStream([remoteVideoTrackRef.current]);
    }

    if (remoteScreenRef.current && remoteScreenTrackRef.current) {
      remoteScreenRef.current.srcObject = new MediaStream([remoteScreenTrackRef.current]);
    }
  }, [remoteScreenSharing]);

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
    remoteUserIdRef.current = null;
    remoteVideoTrackRef.current = null;
    remoteScreenTrackRef.current = null;
    pendingIceCandidatesRef.current = [];
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
  const showRemoteMain = focusedTile === 'remote' || (!showScreenView && focusedTile === 'screen');
  const showLocalMain = focusedTile === 'local';
  const showScreenMain = showScreenView && focusedTile === 'screen';

  const beginDockDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
    setIsDraggingDock(true);
    dragOffsetRef.current = {
      x: event.currentTarget.getBoundingClientRect().right - event.clientX,
      y: event.currentTarget.getBoundingClientRect().bottom - event.clientY,
    };
  };
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full flex-col bg-stone-900">
      {/* Status bar */}
      <div className="flex items-center justify-between border-b border-stone-700/80 bg-stone-900/95 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <BrandLogo compact showText={false} className="mr-1" />
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connectionState === 'connected'
                ? 'bg-green-500'
                : connectionState === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-stone-100">{statusLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-amber-200/30 bg-amber-50/10 px-2.5 py-1 text-xs text-amber-100">
            <Clock3 className="h-3.5 w-3.5" />
            <span className="tabular-nums">{formatDuration(callDurationSec)}</span>
          </span>
          {isScreenSharing && (
            <span className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-1 text-xs text-indigo-300">
              <MonitorUp className="h-3.5 w-3.5" /> Sharing your screen
            </span>
          )}
          <span className="text-xs text-stone-300">
            Room: {roomId.slice(0, 8)}...
          </span>
        </div>
      </div>

      {mediaError && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          {mediaError}
        </div>
      )}

      {/* Video area */}
      <div className="relative flex flex-1 overflow-hidden bg-linear-to-b from-stone-900 via-zinc-900 to-stone-950 p-3">
        <div
          ref={screenContainerRef}
          className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-stone-700/70 bg-black/80"
        >
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-cover ${showRemoteMain ? 'block' : 'hidden'}`}
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover transform-[scaleX(1)] ${showLocalMain ? 'block' : 'hidden'}`}
          />
          <video
            ref={remoteScreenRef}
            autoPlay
            playsInline
            className={`h-full w-full object-contain ${showScreenMain ? 'block' : 'hidden'}`}
          />

          {!remoteUserId && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
                <p className="text-lg text-stone-100">Waiting for participant...</p>
              </div>
            </div>
          )}

          <button
            onClick={toggleFullscreen}
            className="absolute right-3 top-3 rounded-lg border border-stone-500/70 bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>

          <div
            className="absolute z-20 flex gap-2 rounded-xl border border-stone-500/60 bg-stone-950/70 p-2 shadow-2xl backdrop-blur"
            style={{ right: `${dockPosition.x}px`, bottom: `${dockPosition.y}px` }}
          >
            <div
              onMouseDown={beginDockDrag}
              className="absolute -top-2 left-2 cursor-grab rounded-full border border-stone-500/70 bg-stone-800/90 px-2 py-0.5 text-[10px] text-stone-200"
            >
              drag
            </div>

            <button
              onClick={() => setFocusedTile('remote')}
              className={`relative overflow-hidden rounded-lg border ${
                focusedTile === 'remote' ? 'border-amber-300' : 'border-stone-600'
              }`}
            >
              <div className="flex h-20 w-32 items-center justify-center bg-stone-900 text-xs text-stone-200">Participant</div>
              <span className="absolute bottom-1 left-2 text-[11px] text-white/90">Participant</span>
            </button>

            <button
              onClick={() => setFocusedTile('local')}
              className={`relative overflow-hidden rounded-lg border ${
                focusedTile === 'local' ? 'border-amber-300' : 'border-stone-600'
              }`}
            >
              <div className="flex h-20 w-32 items-center justify-center bg-stone-900 text-xs text-stone-200">You</div>
              <span className="absolute bottom-1 left-2 text-[11px] text-white/90">You</span>
            </button>

            {showScreenView && (
              <button
                onClick={() => setFocusedTile('screen')}
                className={`relative overflow-hidden rounded-lg border ${
                  focusedTile === 'screen' ? 'border-amber-300' : 'border-stone-600'
                }`}
              >
                <div className="flex h-20 w-32 items-center justify-center bg-stone-900 text-xs text-stone-200">Screen</div>
                <span className="absolute bottom-1 left-2 text-[11px] text-white/90">Screen</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 border-t border-stone-700/70 bg-stone-900/95 py-4">
        <button
          onClick={toggleMute}
          className={`rounded-full p-3 transition-colors ${
            isMuted
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-slate-700 text-white hover:bg-slate-600'
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
              : 'bg-slate-700 text-white hover:bg-slate-600'
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
              : 'bg-slate-700 text-white hover:bg-slate-600'
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
