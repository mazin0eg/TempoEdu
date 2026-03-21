import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import type { Skill } from '../../types';
import { CATEGORY_COLORS } from '../../lib/constants';

interface SuggestionsListProps {
  suggestions: Skill[];
}

export default function SuggestionsList({ suggestions }: SuggestionsListProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">Suggested for You</h2>
      </div>

      {suggestions.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          Add skill requests to get matching suggestions!
        </p>
      ) : (
        <div className="space-y-3">
          {suggestions.map((skill) => (
            <Link
              key={skill._id}
              to={`/skills/${skill._id}`}
              className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{skill.name}</p>
                  <p className="text-xs text-gray-500">
                    by{' '}
                    {typeof skill.user === 'object'
                      ? `${skill.user.firstName} ${skill.user.lastName}`
                      : 'Unknown'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[skill.category]}`}
                >
                  {skill.category}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
