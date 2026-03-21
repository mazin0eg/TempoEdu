import { Coins, BookOpen, Clock, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sessionsApi } from '../../services/sessions.service';
import { skillsApi } from '../../services/skills.service';
import { creditsApi } from '../../services/credits.service';
import type { Session, Skill } from '../../types';
import { useQuery } from '../../lib/useQuery';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner';
import RecentSessions from '../../components/dashboard/RecentSessions';
import SuggestionsList from '../../components/dashboard/SuggestionsList';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: 'dashboard-sessions',
    queryFn: async () => {
      const { data } = await sessionsApi.getMy();
      return data.data.slice(0, 5);
    },
    refetchInterval: 30_000,
  });

  const { data: suggestions = [], isLoading: sugLoading } = useQuery<Skill[]>({
    queryKey: 'dashboard-suggestions',
    queryFn: async () => {
      const { data } = await skillsApi.getSuggestions();
      return data.data.slice(0, 4);
    },
    refetchInterval: 60_000,
  });

  const { data: balance = 0, isLoading: credLoading } = useQuery<number>({
    queryKey: 'credits-balance',
    queryFn: async () => {
      const { data } = await creditsApi.getBalance();
      return data.data.balance;
    },
    refetchInterval: 30_000,
  });

  const loading = sessionsLoading && sugLoading && credLoading;

  if (loading) return <Spinner />;

  const upcomingSessions = sessions.filter(
    (s) => s.status === 'accepted' || s.status === 'pending',
  );

  return (
    <div className="space-y-8">
      <WelcomeBanner firstName={user?.firstName || ''} />

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
        <RecentSessions sessions={sessions} />
        <SuggestionsList suggestions={suggestions} />
      </div>
    </div>
  );
}
