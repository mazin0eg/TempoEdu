import { useState } from 'react';
import { Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionsApi } from '../../services/sessions.service';
import { useAuth } from '../../context/AuthContext';
import type { Session, SessionStatus } from '../../types';
import { useQuery } from '../../lib/useQuery';
import { useMutation } from '../../lib/useMutation';
import TabBar from '../../components/ui/TabBar';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SessionCard from '../../components/sessions/SessionCard';

const STATUS_TABS = [
  { value: 'all' as const, label: 'All' },
  { value: 'pending' as const, label: 'Pending' },
  { value: 'accepted' as const, label: 'Accepted' },
  { value: 'completed' as const, label: 'Completed' },
  { value: 'cancelled' as const, label: 'Cancelled' },
];

export default function SessionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SessionStatus | 'all'>('all');

  const { data: sessions = [], isLoading: loading } = useQuery<Session[]>({
    queryKey: `sessions-${activeTab}`,
    queryFn: async () => {
      const status = activeTab === 'all' ? undefined : activeTab;
      const { data } = await sessionsApi.getMy(status);
      return data.data;
    },
    refetchInterval: 15_000,
  });

  const actionMutation = useMutation<void, { sessionId: string; action: SessionStatus }>({
    mutationFn: async ({ sessionId, action }) => {
      await sessionsApi.updateStatus(sessionId, { status: action });
    },
    onSuccess: (_data, { action }) => {
      toast.success(
        action === 'accepted'
          ? 'Session accepted!'
          : action === 'rejected'
            ? 'Session rejected'
            : action === 'completed'
              ? 'Session completion confirmed'
              : 'Session cancelled',
      );
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Action failed');
    },
    invalidateKeys: ['sessions', 'dashboard', 'credits'],
  });

  const handleAction = (sessionId: string, action: SessionStatus) => {
    actionMutation.mutate({ sessionId, action });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
        <p className="text-gray-500">Manage your learning & teaching sessions</p>
      </div>

      <TabBar tabs={STATUS_TABS} active={activeTab} onChange={setActiveTab} />

      {loading ? (
        <Spinner />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          message="No sessions found"
          linkTo="/skills"
          linkLabel="Explore skills to book a session"
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session._id}
              session={session}
              currentUserId={user?._id || ''}
              onAction={handleAction}
              isActioning={actionMutation.isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
