import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-blue-300/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />
      </div>
      <Navbar />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
