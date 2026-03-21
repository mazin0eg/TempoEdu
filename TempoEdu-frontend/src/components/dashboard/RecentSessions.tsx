import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { Session } from '../../types';
import { SESSION_STATUS_COLORS } from '../../lib/constants';

interface RecentSessionsProps {
  sessions: Session[];
}

export default function RecentSessions({ sessions }: RecentSessionsProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
        <Link
          to="/sessions"
          className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No sessions yet. Start by exploring skills!
        </p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link
              key={session._id}
              to="/sessions"
              className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {typeof session.skill === 'object' ? session.skill.name : 'Session'}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(session.scheduledAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SESSION_STATUS_COLORS[session.status]}`}
              >
                {session.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
