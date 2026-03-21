import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Coins,
  User,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../services/notifications.service';
import { chatApi } from '../../services/chat.service';
import BrandLogo from '../common/BrandLogo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [notifRes, chatRes] = await Promise.all([
          notificationsApi.getUnreadCount(),
          chatApi.getUnreadCount(),
        ]);
        setUnreadNotif(notifRes.data.data.unreadCount);
        setUnreadChat(chatRes.data.data.unreadCount);
      } catch {
        /* silent */
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-blue-200/60 bg-white/65 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <BrandLogo compact />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            to="/skills"
            className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            Explore
          </Link>
          <Link
            to="/sessions"
            className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            Sessions
          </Link>
          <Link
            to="/my-skills"
            className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            My Skills
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Credits */}
          <div className="flex items-center gap-1 rounded-full bg-blue-100/80 px-3 py-1.5 text-sm font-medium text-blue-800">
            <Coins className="h-4 w-4" />
            <span>{user?.credits ?? 0}</span>
          </div>

          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative rounded-lg p-2 text-blue-700 hover:bg-blue-100/70 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadNotif > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadNotif > 9 ? '9+' : unreadNotif}
              </span>
            )}
          </Link>

          {/* Chat */}
          <Link
            to="/chat"
            className="relative rounded-lg p-2 text-blue-700 hover:bg-blue-100/70 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            {unreadChat > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadChat > 9 ? '9+' : unreadChat}
              </span>
            )}
          </Link>

          {/* Profile */}
          <Link
            to="/profile"
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-100/70 transition-colors"
          >
            <User className="h-4 w-4" />
            <span>{user?.firstName}</span>
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-blue-700 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-blue-800 md:hidden"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-blue-200/60 bg-white/90 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/skills" className="text-sm font-medium text-blue-900" onClick={() => setMobileOpen(false)}>
              Explore
            </Link>
            <Link to="/sessions" className="text-sm font-medium text-blue-900" onClick={() => setMobileOpen(false)}>
              Sessions
            </Link>
            <Link to="/my-skills" className="text-sm font-medium text-blue-900" onClick={() => setMobileOpen(false)}>
              My Skills
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-sm font-medium text-blue-900" onClick={() => setMobileOpen(false)}>
                Admin
              </Link>
            )}
            <Link to="/chat" className="text-sm font-medium text-blue-900" onClick={() => setMobileOpen(false)}>
              Chat {unreadChat > 0 && `(${unreadChat})`}
            </Link>
            <Link to="/notifications" className="text-sm font-medium text-blue-900" onClick={() => setMobileOpen(false)}>
              Notifications {unreadNotif > 0 && `(${unreadNotif})`}
            </Link>
            <Link to="/profile" className="text-sm font-medium text-blue-900" onClick={() => setMobileOpen(false)}>
              Profile
            </Link>
            <hr />
            <button
              onClick={handleLogout}
              className="text-left text-sm font-medium text-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
