import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Star } from 'lucide-react';
import { skillsApi, type SkillFilters } from '../../services/skills.service';
import type { Skill, SkillCategory, SkillLevel } from '../../types';
import {
  SKILL_CATEGORIES,
  SKILL_LEVELS,
  CATEGORY_COLORS,
} from '../../lib/constants';

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SkillFilters>({
    page: 1,
    limit: 12,
    type: 'offer',
  });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const fetchSkills = async () => {
      setLoading(true);
      try {
        const { data } = await skillsApi.getAll(filters);
        setSkills(data.data.skills);
        setTotal(data.data.total);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchSkills();
  }, [filters]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Explore Skills</h1>
        <p className="text-gray-500">Find skills to learn from the community</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search skills..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filters.type || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                type: (e.target.value || undefined) as 'offer' | 'request' | undefined,
                page: 1,
              }))
            }
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="offer">Offers</option>
            <option value="request">Requests</option>
            <option value="">All</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <select
            value={filters.category || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                category: (e.target.value || undefined) as SkillCategory | undefined,
                page: 1,
              }))
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {SKILL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={filters.level || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                level: (e.target.value || undefined) as SkillLevel | undefined,
                page: 1,
              }))
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Levels</option>
            {SKILL_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setFilters({ page: 1, limit: 12, type: 'offer' });
              setSearchInput('');
            }}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Skills Grid */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : skills.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-gray-500">No skills found</p>
          <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <SkillCard key={skill._id} skill={skill} />
            ))}
          </div>

          {/* Pagination */}
          {total > (filters.limit || 12) && (
            <div className="flex justify-center gap-2">
              <button
                disabled={filters.page === 1}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))
                }
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="flex items-center px-3 text-sm text-gray-500">
                Page {filters.page} of{' '}
                {Math.ceil(total / (filters.limit || 12))}
              </span>
              <button
                disabled={
                  (filters.page || 1) >= Math.ceil(total / (filters.limit || 12))
                }
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))
                }
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  const owner = typeof skill.user === 'object' ? skill.user : null;

  return (
    <Link
      to={`/skills/${skill._id}`}
      className="group rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-indigo-200 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[skill.category]}`}
        >
          {skill.category}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {skill.level}
        </span>
      </div>

      <h3 className="mb-1 text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
        {skill.name}
      </h3>
      <p className="mb-4 line-clamp-2 text-sm text-gray-500">
        {skill.description}
      </p>

      {owner && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
              {owner.firstName[0]}
              {owner.lastName[0]}
            </div>
            <span className="text-sm text-gray-600">
              {owner.firstName} {owner.lastName}
            </span>
          </div>
          {owner.reputationScore > 0 && (
            <div className="flex items-center gap-1 text-sm text-amber-600">
              <Star className="h-3.5 w-3.5 fill-amber-400" />
              {owner.reputationScore}
            </div>
          )}
        </div>
      )}

      {skill.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
