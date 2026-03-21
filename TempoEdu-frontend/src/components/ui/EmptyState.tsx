import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
  linkTo?: string;
  linkLabel?: string;
}

export default function EmptyState({ icon, message, linkTo, linkLabel }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center text-gray-300">
        {icon}
      </div>
      <p className="text-lg text-gray-500">{message}</p>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
