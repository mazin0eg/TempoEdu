import { useEffect, useState } from 'react';
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
import { adminApi } from '../../services/admin.service';
import type { User, DashboardStats } from '../../types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          adminApi.getDashboard(),
          adminApi.getUsers(),
        ]);
        setStats(statsRes.data.data);
        setUsers(usersRes.data.data.users);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSuspend = async (userId: string) => {
    try {
      await adminApi.suspendUser(userId);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isSuspended: true } : u)),
      );
      toast.success('User suspended');
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      await adminApi.unsuspendUser(userId);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isSuspended: false } : u,
        ),
      );
      toast.success('User unsuspended');
    } catch {
      toast.error('Failed to unsuspend user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await adminApi.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const statCards = stats
    ? [
        {
          label: 'Total Users',
          value: stats.users.total,
          icon: Users,
          color: 'bg-blue-100 text-blue-600',
        },
        {
          label: 'Total Skills',
          value: stats.skills.total,
          icon: BookOpen,
          color: 'bg-green-100 text-green-600',
        },
        {
          label: 'Total Sessions',
          value: stats.sessions.total,
          icon: CalendarCheck,
          color: 'bg-purple-100 text-purple-600',
        },
        {
          label: 'Completed Sessions',
          value: stats.sessions.completed,
          icon: TrendingUp,
          color: 'bg-amber-100 text-amber-600',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Platform overview & user management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}
              >
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skills by Category */}
      {/* Skills by category could be fetched separately if needed */}

      {/* Users Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900">
            All Users ({users.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Role
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Credits
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{u.credits}</td>
                  <td className="px-4 py-3 text-center">
                    {u.isSuspended ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Suspended
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
