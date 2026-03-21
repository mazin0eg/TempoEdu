import { useMemo, useState } from 'react';
import {
  Users,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  Ban,
  CheckCircle,
  Trash2,
  Shield,
  Clock3,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '../../services/admin.service';
import type { User, DashboardStats, Session, SkillCategory } from '../../types';
import { useQuery, invalidateQueries } from '../../lib/useQuery';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import TabBar from '../../components/ui/TabBar';

type AdminTab = 'overview' | 'users' | 'sessions' | 'skills';

const ADMIN_TABS: Array<{ value: AdminTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'users', label: 'Users' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'skills', label: 'Skills' },
];

function normalizeCategoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: 'admin-stats',
    queryFn: async () => {
      const res = await adminApi.getDashboard();
      return res.data.data;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: users = [], isLoading: loading } = useQuery<User[]>({
    queryKey: 'admin-users',
    queryFn: async () => {
      const res = await adminApi.getUsers();
      return res.data.data.users;
    },
    refetchOnWindowFocus: true,
  });

  const { data: skillCategories = {} } = useQuery<Record<string, number>>({
    queryKey: 'admin-skills-categories',
    queryFn: async () => {
      const res = await adminApi.getSkillsByCategory();
      return res.data.data;
    },
    refetchOnWindowFocus: true,
  });

  const { data: recentSessions = [] } = useQuery<Session[]>({
    queryKey: 'admin-recent-sessions',
    queryFn: async () => {
      const res = await adminApi.getRecentSessions(30);
      return res.data.data;
    },
    refetchOnWindowFocus: true,
  });

  const handleSuspend = async (userId: string) => {
    try {
      await adminApi.suspendUser(userId);
      invalidateQueries('admin-users');
      toast.success('User suspended');
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      await adminApi.unsuspendUser(userId);
      invalidateQueries('admin-users');
      toast.success('User unsuspended');
    } catch {
      toast.error('Failed to unsuspend user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await adminApi.deleteUser(userId);
      invalidateQueries('admin');
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const columns = useMemo<ColumnDef<User, any>[]>(
    () => [
      {
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        id: 'name',
        header: 'Name',
        cell: ({ getValue }) => (
          <span className="font-medium text-gray-900">{getValue()}</span>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ getValue }) => (
          <span className="text-gray-500">{getValue()}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ getValue }) => {
          const role = getValue() as string;
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {role}
            </span>
          );
        },
      },
      {
        accessorKey: 'credits',
        header: 'Credits',
      },
      {
        accessorKey: 'isSuspended',
        header: 'Status',
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Suspended
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Active
            </span>
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-1">
              {u.isSuspended ? (
                <button
                  onClick={() => handleUnsuspend(u._id)}
                  className="rounded p-1 text-green-600 hover:bg-green-50"
                  title="Unsuspend"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleSuspend(u._id)}
                  className="rounded p-1 text-amber-600 hover:bg-amber-50"
                  title="Suspend"
                >
                  <Ban className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => handleDelete(u._id)}
                className="rounded p-1 text-red-600 hover:bg-red-50"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const sessionColumns = useMemo<ColumnDef<Session, any>[]>(
    () => [
      {
        id: 'learner',
        header: 'Learner',
        accessorFn: (row) =>
          typeof row.requester === 'object'
            ? `${row.requester.firstName} ${row.requester.lastName}`
            : 'Unknown',
      },
      {
        id: 'teacher',
        header: 'Teacher',
        accessorFn: (row) =>
          typeof row.provider === 'object'
            ? `${row.provider.firstName} ${row.provider.lastName}`
            : 'Unknown',
      },
      {
        id: 'skill',
        header: 'Skill',
        accessorFn: (row) =>
          typeof row.skill === 'object' ? row.skill.name : 'Session',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string;
          const style =
            status === 'completed'
              ? 'bg-green-100 text-green-700'
              : status === 'accepted'
                ? 'bg-blue-100 text-blue-700'
                : status === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700';

          return (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'scheduledAt',
        header: 'Scheduled',
        cell: ({ getValue }) => (
          <span className="text-gray-600">
            {new Date(getValue() as string).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'duration',
        header: 'Duration',
        cell: ({ getValue }) => `${getValue()}h`,
      },
    ],
    [],
  );

  const totalSkillsByCategory = Object.values(skillCategories).reduce(
    (sum, count) => sum + count,
    0,
  );

  const topCategories = (Object.entries(skillCategories) as Array<[
    SkillCategory,
    number,
  ]>).sort((a, b) => b[1] - a[1]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Control users, sessions, and platform performance</p>
      </div>

      <TabBar tabs={ADMIN_TABS} active={activeTab} onChange={setActiveTab} />

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total Users"
            value={stats.users.total}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Total Skills"
            value={stats.skills.total}
            color="bg-green-100 text-green-600"
          />
          <StatCard
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Total Sessions"
            value={stats.sessions.total}
            color="bg-purple-100 text-purple-600"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Completed Sessions"
            value={stats.sessions.completed}
            color="bg-amber-100 text-amber-600"
          />
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Platform Health</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Active users</span>
                <span className="font-semibold text-gray-900">{stats?.users.active ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Suspended users</span>
                <span className="font-semibold text-red-600">{stats?.users.suspended ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Pending sessions</span>
                <span className="font-semibold text-amber-600">{stats?.sessions.pending ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Average rating</span>
                <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {stats?.reviews.averageRating ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Recent Session Activity</h2>
            <div className="space-y-2">
              {recentSessions.slice(0, 6).map((session) => {
                const requesterName =
                  typeof session.requester === 'object'
                    ? `${session.requester.firstName} ${session.requester.lastName}`
                    : 'Unknown learner';
                const providerName =
                  typeof session.provider === 'object'
                    ? `${session.provider.firstName} ${session.provider.lastName}`
                    : 'Unknown teacher';
                const skillName =
                  typeof session.skill === 'object' ? session.skill.name : 'Session';

                return (
                  <div
                    key={session._id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{skillName}</p>
                      <p className="text-xs text-gray-500">
                        {requesterName} with {providerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {session.status}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              {recentSessions.length === 0 && (
                <p className="text-sm text-gray-500">No recent sessions found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <h2 className="mb-3 font-semibold text-gray-900">All Users ({users.length})</h2>
          <DataTable
            data={users}
            columns={columns}
            searchColumn="name"
            searchPlaceholder="Search users by name or email..."
            pageSize={12}
          />
        </div>
      )}

      {activeTab === 'sessions' && (
        <div>
          <h2 className="mb-3 font-semibold text-gray-900">Recent Sessions ({recentSessions.length})</h2>
          <DataTable
            data={recentSessions}
            columns={sessionColumns}
            searchColumn="skill"
            searchPlaceholder="Search sessions..."
            pageSize={12}
          />
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Skills by Category</h2>
            <div className="space-y-3">
              {topCategories.map(([category, count]) => {
                const ratio = totalSkillsByCategory > 0 ? (count / totalSkillsByCategory) * 100 : 0;

                return (
                  <div key={category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{normalizeCategoryLabel(category)}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${Math.max(ratio, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {topCategories.length === 0 && (
                <p className="text-sm text-gray-500">No active skills found.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Quick Metrics</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-gray-600">
                  <BookOpen className="h-4 w-4" /> Total active skills
                </span>
                <span className="font-semibold text-gray-900">{stats?.skills.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-gray-600">
                  <CalendarCheck className="h-4 w-4" /> Total sessions
                </span>
                <span className="font-semibold text-gray-900">{stats?.sessions.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-gray-600">
                  <Clock3 className="h-4 w-4" /> Pending sessions
                </span>
                <span className="font-semibold text-amber-600">{stats?.sessions.pending ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-gray-600">
                  <Shield className="h-4 w-4" /> Suspended users
                </span>
                <span className="font-semibold text-red-600">{stats?.users.suspended ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
