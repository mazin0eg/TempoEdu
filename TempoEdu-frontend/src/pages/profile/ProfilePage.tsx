import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../services/users.service';
import { creditsApi } from '../../services/credits.service';
import { skillsApi } from '../../services/skills.service';
import { sessionsApi } from '../../services/sessions.service';
import type { Transaction, Skill, Session } from '../../types';
import { useQuery } from '../../lib/useQuery';
import { useMutation } from '../../lib/useMutation';
import TabBar from '../../components/ui/TabBar';
import Spinner from '../../components/ui/Spinner';
import ProfileCard from '../../components/profile/ProfileCard';
import ProfileForm from '../../components/profile/ProfileForm';
import SkillsGrid from '../../components/profile/SkillsGrid';
import SessionsTimeline from '../../components/profile/SessionsTimeline';
import CreditsTab from '../../components/profile/CreditsTab';

const TABS = [
  { value: 'profile' as const, label: 'Profile' },
  { value: 'skills' as const, label: 'Skills & Sessions' },
  { value: 'credits' as const, label: 'Credits & History' },
];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState<'profile' | 'skills' | 'credits'>('profile');
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    languages: user?.languages?.join(', ') || '',
  });

  const { data: creditsData } = useQuery<{ balance: number; transactions: Transaction[] }>({
    queryKey: 'profile-credits',
    queryFn: async () => {
      const [balRes, histRes] = await Promise.all([
        creditsApi.getBalance(),
        creditsApi.getHistory(),
      ]);
      return {
        balance: balRes.data.data.balance,
        transactions: histRes.data.data.transactions,
      };
    },
    enabled: tab === 'credits',
    refetchInterval: 30_000,
  });

  const balance = creditsData?.balance ?? user?.credits ?? 0;
  const transactions = creditsData?.transactions ?? [];

  const { data: skillsSessionsData, isLoading: loadingSkills } = useQuery<{
    skills: Skill[];
    sessions: Session[];
  }>({
    queryKey: 'profile-skills-sessions',
    queryFn: async () => {
      const [skillsRes, sessionsRes] = await Promise.all([
        skillsApi.getMy(),
        sessionsApi.getMy(),
      ]);
      return { skills: skillsRes.data.data, sessions: sessionsRes.data.data };
    },
    enabled: tab === 'skills',
    refetchOnWindowFocus: true,
  });

  const skills = skillsSessionsData?.skills ?? [];
  const sessions = skillsSessionsData?.sessions ?? [];

  const saveMutation = useMutation<void, FormEvent>({
    mutationFn: async () => {
      const { data } = await usersApi.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        bio: form.bio,
        languages: form.languages
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
      });
      updateUser(data.data);
    },
    onSuccess: () => toast.success('Profile updated'),
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(e);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'profile' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ProfileCard user={user!} />
          <div className="lg:col-span-2">
            <ProfileForm
              form={form}
              onChange={setForm}
              onSubmit={handleSave}
              isSaving={saveMutation.isLoading}
            />
          </div>
        </div>
      ) : tab === 'skills' ? (
        loadingSkills ? (
          <Spinner />
        ) : (
          <div className="space-y-8">
            <SkillsGrid skills={skills} />
            <SessionsTimeline sessions={sessions} currentUserId={user?._id || ''} />
          </div>
        )
      ) : (
        <CreditsTab balance={balance} transactions={transactions} />
      )}
    </div>
  );
}
