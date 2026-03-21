import { Star, Coins } from 'lucide-react';
import type { User } from '../../types';

interface ProfileCardProps {
  user: User;
}

export default function ProfileCard({ user }: ProfileCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
      <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600">
        {user.firstName[0]}
        {user.lastName[0]}
      </div>
      <h2 className="text-lg font-semibold text-gray-900">
        {user.firstName} {user.lastName}
      </h2>
      <p className="text-sm text-gray-500">{user.email}</p>

      <div className="mt-4 flex justify-center gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-amber-600">
            <Star className="h-4 w-4 fill-amber-400" />
            <span className="font-semibold">{user.reputationScore || 0}</span>
          </div>
          <p className="text-xs text-gray-500">Rating</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-amber-600">
            <Coins className="h-4 w-4" />
            <span className="font-semibold">{user.credits || 0}</span>
          </div>
          <p className="text-xs text-gray-500">Credits</p>
        </div>
      </div>
    </div>
  );
}
