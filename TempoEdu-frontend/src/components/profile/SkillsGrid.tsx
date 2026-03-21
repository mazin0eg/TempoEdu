import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen } from 'lucide-react';
import type { Skill } from '../../types';
import { CATEGORY_COLORS } from '../../lib/constants';

interface SkillsGridProps {
  skills: Skill[];
}

export default function SkillsGrid({ skills }: SkillsGridProps) {
  const offers = skills.filter((s) => s.type === 'offer');
  const requests = skills.filter((s) => s.type === 'request');

  if (skills.length === 0) {
    return (
      <div className="py-12 text-center">
        <BookOpen className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg text-gray-500">No skills listed yet</p>
        <Link
          to="/my-skills"
          className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Add your first skill
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {offers.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Skills I Offer</h2>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {offers.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((skill) => (
              <SkillCard key={skill._id} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Skills I Want to Learn</h2>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              {requests.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((skill) => (
              <SkillCard key={skill._id} skill={skill} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Link
      to={`/skills/${skill._id}`}
      className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <h3 className="font-semibold text-gray-900">{skill.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-gray-500">{skill.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[skill.category]}`}>
          {skill.category}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {skill.level}
        </span>
      </div>
    </Link>
  );
}
