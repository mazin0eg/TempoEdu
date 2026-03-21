import type { FormEvent } from 'react';

interface ProfileFormProps {
  form: { firstName: string; lastName: string; bio: string; languages: string };
  onChange: (form: { firstName: string; lastName: string; bio: string; languages: string }) => void;
  onSubmit: (e: FormEvent) => void;
  isSaving: boolean;
}

export default function ProfileForm({ form, onChange, onSubmit, isSaving }: ProfileFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-gray-200 bg-white p-6 space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">First name</label>
          <input
            value={form.firstName}
            onChange={(e) => onChange({ ...form, firstName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Last name</label>
          <input
            value={form.lastName}
            onChange={(e) => onChange({ ...form, lastName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
        <textarea
          value={form.bio}
          onChange={(e) => onChange({ ...form, bio: e.target.value })}
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
          onChange={(e) => onChange({ ...form, languages: e.target.value })}
          placeholder="e.g. English, French, Arabic"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
