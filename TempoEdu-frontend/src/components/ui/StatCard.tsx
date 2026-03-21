import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
  color: string;
}

export default function StatCard({ icon, label, value, suffix = '', color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className={`mb-3 inline-flex rounded-lg p-2.5 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {suffix && <span className="text-sm font-normal text-gray-400">{suffix}</span>}
      </p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
