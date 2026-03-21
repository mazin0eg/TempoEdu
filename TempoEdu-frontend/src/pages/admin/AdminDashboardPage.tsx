import { useMemo } from 'react';
import {
  Users,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  Ban,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '../../services/admin.service';
import type { User, DashboardStats } from '../../types';
import { useQuery, invalidateQueries } from '../../lib/useQuery';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';

export default function AdminDashboardPage() {
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

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Platform overview & user management</p>
      </div>

      {/* Stats Cards */}
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

      {/* Users DataTable */}
      <div>
        <h2 className="mb-3 font-semibold text-gray-900">All Users ({users.length})</h2>
        <DataTable
          data={users}
          columns={columns}
          searchColumn="name"
          searchPlaceholder="Search users..."
          pageSize={10}
        />
      </div>
    </div>
  );
}
