import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User as UserIcon, Video } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { sessionsApi } from '../../services/sessions.service';
import { useAuth } from '../../context/AuthContext';
import type { Session, SessionStatus } from '../../types';
import { SESSION_STATUS_COLORS } from '../../lib/constants';

const STATUS_TABS: { value: SessionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function SessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SessionStatus | 'all'>('all');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const status = activeTab === 'all' ? undefined : activeTab;
      const { data } = await sessionsApi.getMy(status);
      setSessions(data.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSessions();
  }, [activeTab]);

  const handleAction = async (
    sessionId: string,
    action: SessionStatus,
  ) => {
    try {
      await sessionsApi.updateStatus(sessionId, { status: action });
      toast.success(
        action === 'accepted'
          ? 'Session accepted!'
          : action === 'rejected'
            ? 'Session rejected'
            : action === 'completed'
              ? 'Session completion confirmed'
              : 'Session cancelled',
      );
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
        <p className="text-gray-500">Manage your learning & teaching sessions</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center">
          <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-lg text-gray-500">No sessions found</p>
          <Link
            to="/skills"
            className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Explore skills to book a session
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isProvider =
              typeof session.provider === 'object' &&
              session.provider._id === user?._id;
            const isRequester =
              typeof session.requester === 'object' &&
              session.requester._id === user?._id;
            const otherUser =
              typeof session.provider === 'object' &&
              typeof session.requester === 'object'
                ? isProvider
                  ? session.requester
                  : session.provider
                : null;
            const skillName =
              typeof session.skill === 'object'
                ? session.skill.name
                : 'Session';

            return (
              <div
                key={session._id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SESSION_STATUS_COLORS[session.status]}`}
                      >
                        {session.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {isProvider ? 'You are teaching' : 'You are learning'}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">
                      {skillName}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      {otherUser && (
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4" />
                          {otherUser.firstName} {otherUser.lastName}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(
                          new Date(session.scheduledAt),
                          'MMM d, yyyy h:mm a',
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {session.duration}h
                      </div>
                    </div>

                    {session.message && (
                      <p className="mt-2 text-sm text-gray-500 italic">
                        "{session.message}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {session.status === 'pending' && isProvider && (
                      <>
                        <button
                          onClick={() => handleAction(session._id, 'accepted')}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleAction(session._id, 'rejected')}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {session.status === 'accepted' && (
                      <>
                        {session.roomId && (
                          <Link
                            to={`/sessions/${session._id}/call`}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                          >
                            <Video className="h-4 w-4" />
                            Join Call
                          </Link>
                        )}
                        <button
                          onClick={() =>
                            handleAction(session._id, 'completed')
                          }
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                          {(isRequester && session.requesterConfirmed) ||
                          (isProvider && session.providerConfirmed)
                            ? 'Waiting for other...'
                            : 'Confirm Complete'}
                        </button>
                        <button
                          onClick={() =>
                            handleAction(session._id, 'cancelled')
                          }
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {session.status === 'pending' && isRequester && (
                      <button
                        onClick={() => handleAction(session._id, 'cancelled')}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
