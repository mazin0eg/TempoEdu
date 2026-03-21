import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Spinner from './components/ui/Spinner';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const SkillDetailPage = lazy(() => import('./pages/skills/SkillDetailPage'));
const SkillsPage = lazy(() => import('./pages/skills/SkillsPage'));
const MySkillsPage = lazy(() => import('./pages/skills/MySkillsPage.tsx'));
const CertificatePage = lazy(() => import('./pages/skills/CertificatePage'));
const SessionsPage = lazy(() => import('./pages/sessions/SessionsPage'));
const VideoCallPage = lazy(() => import('./pages/sessions/VideoCallPage'));
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const UserDetailPage = lazy(() => import('./pages/users/UserDetailPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

          <Suspense fallback={<Spinner />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/skills" element={<SkillsPage />} />
                <Route path="/skills/:skillId" element={<SkillDetailPage />} />
                <Route path="/my-skills" element={<MySkillsPage />} />
                <Route path="/certificate/:earnedSkillId" element={<CertificatePage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route
                  path="/sessions/:sessionId/call"
                  element={<VideoCallPage />}
                />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:conversationId" element={<ChatPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/users/:userId" element={<UserDetailPage />} />

                {/* Admin */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
