import { Link } from 'react-router-dom';

interface WelcomeBannerProps {
  firstName: string;
}

export default function WelcomeBanner({ firstName }: WelcomeBannerProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
      <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
      <p className="mt-2 text-indigo-100">
        Ready to learn something new or share your expertise?
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/skills"
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          Explore Skills
        </Link>
        <Link
          to="/my-skills"
          className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
        >
          Manage My Skills
        </Link>
      </div>
    </div>
  );
}
