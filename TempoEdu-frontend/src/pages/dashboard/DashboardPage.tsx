import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, BookOpen, Clock, Star, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sessionsApi } from '../../services/sessions.service';
import { skillsApi } from '../../services/skills.service';
import { creditsApi } from '../../services/credits.service';
import type { Session, Skill } from '../../types';
import { SESSION_STATUS_COLORS, CATEGORY_COLORS } from '../../lib/constants';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [suggestions, setSuggestions] = useState<Skill[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessRes, sugRes, credRes] = await Promise.all([
          sessionsApi.getMy(),
          skillsApi.getSuggestions(),
          creditsApi.getBalance(),
        ]);
        setSessions(sessRes.data.data.slice(0, 5));
        setSuggestions(sugRes.data.data.slice(0, 4));
        setBalance(credRes.data.data.balance);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const upcomingSessions = sessions.filter(
    (s) => s.status === 'accepted' || s.status === 'pending',
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
        <p className="mt-2 text-indigo-100">
          Ready to learn something new or share your expertise?
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/skills"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Explore Skills
          </Link>
          <Link
            to="/my-skills"
            className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Manage My Skills
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          label="Credits Balance"
          value={balance}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Completed Sessions"
          value={sessions.filter((s) => s.status === 'completed').length}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Upcoming Sessions"
          value={upcomingSessions.length}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Reputation"
          value={user?.reputationScore ?? 0}
          suffix="/5"
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
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
                  to={`/sessions/${session._id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {typeof session.skill === 'object'
                        ? session.skill.name
                        : 'Session'}
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

        {/* Skill Suggestions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Suggested for You
            </h2>
          </div>

          {suggestions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Add skill requests to get matching suggestions!
            </p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((skill) => (
                <Link
                  key={skill._id}
                  to={`/skills/${skill._id}`}
                  className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {skill.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        by{' '}
                        {typeof skill.user === 'object'
                          ? `${skill.user.firstName} ${skill.user.lastName}`
                          : 'Unknown'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[skill.category]}`}
                    >
                      {skill.category}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix = '',
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className={`mb-3 inline-flex rounded-lg p-2.5 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {suffix && <span className="text-sm font-normal text-gray-400">{suffix}</span>}
      </p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
