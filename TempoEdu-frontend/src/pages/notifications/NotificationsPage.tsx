import { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { notificationsApi } from '../../services/notifications.service';
import type { Notification } from '../../types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationsApi.getAll(1, 50);
      setNotifications(data.data.notifications);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">Stay updated on your activity</p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-16 text-center">
          <Bell className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-lg text-gray-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                notification.isRead
                  ? 'border-gray-200 bg-white'
                  : 'border-indigo-200 bg-indigo-50'
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                  notification.isRead
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                <Bell className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">
                  {notification.title}
                </p>
                <p className="text-sm text-gray-500">
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>

              {!notification.isRead && (
                <button
                  onClick={() => handleMarkRead(notification._id)}
                  className="rounded-lg p-1 text-gray-400 hover:text-indigo-600"
                  title="Mark as read"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
