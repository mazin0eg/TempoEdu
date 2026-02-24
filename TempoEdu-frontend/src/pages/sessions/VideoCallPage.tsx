import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sessionsApi } from '../../services/sessions.service';
import type { Session } from '../../types';
import VideoRoom from '../../components/video/VideoRoom';

export default function VideoCallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    sessionsApi
      .getById(sessionId)
      .then(({ data }) => {
        const s = data.data;
        if (s.status !== 'accepted' || !s.roomId) {
          toast.error('This session does not have an active video room');
          navigate('/sessions');
          return;
        }
        setSession(s);
      })
      .catch(() => {
        toast.error('Session not found');
        navigate('/sessions');
      })
      .finally(() => setLoading(false));
  }, [sessionId, navigate]);

  const handleLeave = () => {
    navigate('/sessions');
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!session?.roomId) return null;

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden rounded-xl">
      <VideoRoom roomId={session.roomId} onLeave={handleLeave} />
    </div>
  );
}
