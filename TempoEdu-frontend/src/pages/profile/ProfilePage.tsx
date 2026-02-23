import { useState, type FormEvent, useEffect } from 'react';
import { Coins, Star, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../services/users.service';
import { creditsApi } from '../../services/credits.service';
import type { Transaction } from '../../types';
import { format } from 'date-fns';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState<'profile' | 'credits'>('profile');
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    languages: user?.languages?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(user?.credits || 0);

  useEffect(() => {
    if (tab === 'credits') {
      const fetchCredits = async () => {
        try {
          const [balRes, histRes] = await Promise.all([
            creditsApi.getBalance(),
            creditsApi.getHistory(),
          ]);
          setBalance(balRes.data.data.balance);
          setTransactions(histRes.data.data.transactions);
        } catch {
          /* silent */
        }
      };
      fetchCredits();
    }
  }, [tab]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
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
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        <button
          onClick={() => setTab('profile')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'profile'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setTab('credits')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'credits'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          Credits & History
        </button>
      </div>

      {tab === 'profile' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600">
              {user?.firstName[0]}
              {user?.lastName[0]}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-gray-500">{user?.email}</p>

            <div className="mt-4 flex justify-center gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-amber-600">
                  <Star className="h-4 w-4 fill-amber-400" />
                  <span className="font-semibold">
                    {user?.reputationScore || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Rating</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-amber-600">
                  <Coins className="h-4 w-4" />
                  <span className="font-semibold">{user?.credits || 0}</span>
                </div>
                <p className="text-xs text-gray-500">Credits</p>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSave}
              className="rounded-xl border border-gray-200 bg-white p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    First name
                  </label>
                  <input
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Last name
                  </label>
                  <input
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Languages (comma separated)
                </label>
                <input
                  value={form.languages}
                  onChange={(e) =>
                    setForm({ ...form, languages: e.target.value })
                  }
                  placeholder="e.g. English, French, Arabic"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Balance */}
          <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Coins className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{balance}</p>
                <p className="text-sm text-gray-500">Available credits</p>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900">
                Transaction History
              </h2>
            </div>
            {transactions.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">
                No transactions yet
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          tx.amount > 0
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {tx.amount > 0 ? '+' : '-'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {tx.description}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(
                            new Date(tx.createdAt),
                            'MMM d, yyyy h:mm a',
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {tx.amount > 0 ? '+' : ''}
                        {tx.amount}
                      </p>
                      <p className="text-xs text-gray-400">
                        Balance: {tx.balanceAfter}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
