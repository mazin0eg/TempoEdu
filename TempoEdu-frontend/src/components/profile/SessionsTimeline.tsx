import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User as UserIcon,
  GraduationCap,
  BookOpen,
  Video,
  CheckCircle2,
  XCircle,
  Timer,
  Zap,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import type { Session, User, SessionStatus } from '../../types';
import EmptyState from '../ui/EmptyState';

interface SessionsTimelineProps {
  sessions: Session[];
  currentUserId: string;
}

const STATUS_CONFIG: Record<SessionStatus, {
  gradient: string;
  glow: string;
  icon: typeof CheckCircle2;
  pulseColor: string;
  label: string;
}> = {
  completed: {
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/30',
    icon: CheckCircle2,
    pulseColor: 'bg-emerald-400',
    label: 'Completed',
  },
  accepted: {
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/30',
    icon: Video,
    pulseColor: 'bg-blue-400',
    label: 'Accepted',
  },
  pending: {
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-500/30',
    icon: Timer,
    pulseColor: 'bg-amber-400',
    label: 'Pending',
  },
  rejected: {
    gradient: 'from-red-400 to-rose-500',
    glow: 'shadow-red-500/20',
    icon: XCircle,
    pulseColor: 'bg-red-400',
    label: 'Rejected',
  },
  cancelled: {
    gradient: 'from-gray-400 to-slate-500',
    glow: 'shadow-gray-400/20',
    icon: XCircle,
    pulseColor: 'bg-gray-400',
    label: 'Cancelled',
  },
};

export default function SessionsTimeline({ sessions, currentUserId }: SessionsTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<SessionStatus | 'all'>('all');

  const filtered = filterStatus === 'all'
    ? sessions
    : sessions.filter((s) => s.status === filterStatus);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-12 w-12" />}
        message="No sessions yet"
        linkTo="/skills"
        linkLabel="Explore skills to book a session"
      />
    );
  }

  const statusCounts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Header with animated stats */}
      <div className="mb-6 flex items-center gap-2">
        <Zap className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          {sessions.length}
        </span>
      </div>

      {/* Status Filter Pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        <FilterPill
          active={filterStatus === 'all'}
          onClick={() => setFilterStatus('all')}
          label="All"
          count={sessions.length}
        />
        {(Object.keys(STATUS_CONFIG) as SessionStatus[]).map((status) =>
          statusCounts[status] ? (
            <FilterPill
              key={status}
              active={filterStatus === status}
              onClick={() => setFilterStatus(status)}
              label={STATUS_CONFIG[status].label}
              count={statusCounts[status]}
              gradient={STATUS_CONFIG[status].gradient}
            />
          ) : null,
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Rail */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 via-emerald-300 to-gray-200" />

        <div className="space-y-0">
          {sorted.map((session, index) => {
            const isProvider =
              typeof session.provider === 'object' && session.provider._id === currentUserId;
            const otherUser =
              typeof session.provider === 'object' && typeof session.requester === 'object'
                ? isProvider
                  ? (session.requester as User)
                  : (session.provider as User)
                : null;
            const skillName =
              typeof session.skill === 'object' ? session.skill.name : 'Session';
            const config = STATUS_CONFIG[session.status];
            const StatusIcon = config.icon;
            const isHovered = hoveredId === session._id;
            const scheduledDate = new Date(session.scheduledAt);
            const isUpcoming = isFuture(scheduledDate);
            const isPastSession = isPast(scheduledDate);

            return (
              <div
                key={session._id}
                className="relative pl-14 pb-6 group"
                onMouseEnter={() => setHoveredId(session._id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  animation: `fadeSlideIn 0.4s ease-out ${index * 0.06}s both`,
                }}
              >
                {/* Timeline Node */}
                <div className="absolute left-[14px] top-4 z-10">
                  {/* Pulse ring for active sessions */}
                  {(session.status === 'accepted' || session.status === 'pending') && (
                    <span
                      className={`absolute inset-0 rounded-full ${config.pulseColor} opacity-40`}
                      style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
                    />
                  )}
                  <div
                    className={`relative flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${config.gradient} shadow-lg ${config.glow} transition-transform duration-300 ${
                      isHovered ? 'scale-125' : ''
                    }`}
                  >
                    <StatusIcon className="h-3 w-3 text-white" />
                  </div>
                </div>

                {/* Card */}
                <div
                  className={`rounded-xl border bg-white transition-all duration-300 overflow-hidden ${
                    isHovered
                      ? `border-transparent shadow-lg ${config.glow} shadow-xl`
                      : 'border-gray-200 shadow-sm'
                  }`}
                >
                  {/* Status gradient strip at top */}
                  <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />

                  <div className="p-4">
                    {/* Top row: role badge + time + status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isProvider
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {isProvider ? (
                            <GraduationCap className="h-3 w-3" />
                          ) : (
                            <BookOpen className="h-3 w-3" />
                          )}
                          {isProvider ? 'Teaching' : 'Learning'}
                        </span>
                        {isUpcoming && session.status === 'accepted' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                            </span>
                            Upcoming
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(scheduledDate, { addSuffix: true })}
                      </span>
                    </div>

                    {/* Skill name */}
                    <h3 className="text-base font-bold text-gray-900">
                      {skillName}
                    </h3>

                    {/* Details row */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      {otherUser && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                            {otherUser.firstName[0]}{otherUser.lastName[0]}
                          </span>
                          {otherUser.firstName} {otherUser.lastName}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(scheduledDate, 'MMM d, yyyy')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(scheduledDate, 'h:mm a')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" />
                        {session.duration}h
                      </span>
                    </div>

                    {/* Expandable section on hover */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isHovered ? 'max-h-24 opacity-100 mt-3' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        {session.status === 'accepted' && session.roomId && (
                          <Link
                            to={`/sessions/${session._id}/call`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                          >
                            <Video className="h-3.5 w-3.5" />
                            Join Call
                          </Link>
                        )}
                        <Link
                          to="/sessions"
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          View Details
                        </Link>
                        {isPastSession && session.status === 'completed' && (
                          <span className="ml-auto text-xs text-emerald-600 font-medium">
                            Session completed successfully
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes ping {
          75%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  gradient,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  gradient?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
        active
          ? gradient
            ? `bg-gradient-to-r ${gradient} text-white shadow-md`
            : 'bg-gray-900 text-white shadow-md'
          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
          active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
