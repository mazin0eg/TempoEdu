import { Link } from 'react-router-dom';
import { Calendar, Clock, User as UserIcon, Video } from 'lucide-react';
import { format } from 'date-fns';
import type { Session, SessionStatus, User } from '../../types';
import { SESSION_STATUS_COLORS } from '../../lib/constants';

interface SessionCardProps {
  session: Session;
  currentUserId: string;
  onAction: (sessionId: string, action: SessionStatus) => void;
  isActioning: boolean;
}

export default function SessionCard({ session, currentUserId, onAction, isActioning }: SessionCardProps) {
  const isProvider =
    typeof session.provider === 'object' && session.provider._id === currentUserId;
  const isRequester =
    typeof session.requester === 'object' && session.requester._id === currentUserId;
  const isRequestedSkill =
    typeof session.skill === 'object' && session.skill.type === 'request';
  const canRespondToPending =
    session.status === 'pending' &&
    ((isRequestedSkill && isRequester) || (!isRequestedSkill && isProvider));

  const otherUser =
    typeof session.provider === 'object' && typeof session.requester === 'object'
      ? isProvider
        ? (session.requester as User)
        : (session.provider as User)
      : null;
  const skillName =
    typeof session.skill === 'object' ? session.skill.name : 'Session';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SESSION_STATUS_COLORS[session.status]}`}
            >
              {session.status}
            </span>
            <span className="text-xs text-gray-400">
              {session.status === 'pending' && isRequestedSkill
                ? isRequester
                  ? 'Choose a teacher offer'
                  : 'Waiting for learner to choose'
                : isProvider
                  ? 'You are teaching'
                  : 'You are learning'}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">{skillName}</h3>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {otherUser && (
              <div className="flex items-center gap-1">
                <UserIcon className="h-4 w-4" />
                <Link
                  to={`/users/${otherUser._id}`}
                  className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  {otherUser.firstName} {otherUser.lastName}
                </Link>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(session.scheduledAt), 'MMM d, yyyy h:mm a')}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {session.duration}h
            </div>
          </div>

          {session.message && (
            <p className="mt-2 text-sm text-gray-500 italic">"{session.message}"</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canRespondToPending && (
            <>
              <button
                onClick={() => onAction(session._id, 'accepted')}
                disabled={isActioning}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isRequestedSkill ? 'Accept Teacher' : 'Accept'}
              </button>
              <button
                onClick={() => onAction(session._id, 'rejected')}
                disabled={isActioning}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isRequestedSkill ? 'Decline Offer' : 'Reject'}
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
                onClick={() => onAction(session._id, 'completed')}
                disabled={isActioning}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {(isRequester && session.requesterConfirmed) ||
                (isProvider && session.providerConfirmed)
                  ? 'Waiting for other...'
                  : 'Confirm Complete'}
              </button>
              <button
                onClick={() => onAction(session._id, 'cancelled')}
                disabled={isActioning}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
          {session.status === 'pending' && isRequester && !isRequestedSkill && (
            <button
              onClick={() => onAction(session._id, 'cancelled')}
              disabled={isActioning}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          {session.status === 'pending' && isRequestedSkill && isProvider && (
            <button
              type="button"
              disabled
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500"
            >
              Waiting for learner
            </button>
          )}

          {session.status === 'pending' && isRequestedSkill && isRequester && (
            <button
              onClick={() => onAction(session._id, 'cancelled')}
              disabled={isActioning}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
