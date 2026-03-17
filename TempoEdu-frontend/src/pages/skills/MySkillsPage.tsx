import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Award,
  FileBadge,
  Eye,
  EyeOff,
} from 'lucide-react';
import { skillsApi } from '../../services/skills.service';
import { sessionsApi } from '../../services/sessions.service';
import { useAuth } from '../../context/AuthContext';
import type { Skill, SkillCategory, SkillLevel, EarnedSkill, Session } from '../../types';
import { SKILL_CATEGORIES, SKILL_LEVELS, CATEGORY_COLORS } from '../../lib/constants';
import toast from 'react-hot-toast';
import { useQuery } from '../../lib/useQuery';
import { useMutation } from '../../lib/useMutation';

interface SkillForm {
  name: string;
  description: string;
  category: SkillCategory;
  level: SkillLevel;
  type: 'offer' | 'request';
  tags: string;
}

const emptyForm: SkillForm = {
  name: '',
  description: '',
  category: 'programming',
  level: 'intermediate',
  type: 'offer',
  tags: '',
};

export default function MySkillsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SkillForm>(emptyForm);

  const { data: skills = [], isLoading: loading } = useQuery<Skill[]>({
    queryKey: 'my-skills',
    queryFn: async () => {
      const { data } = await skillsApi.getMy();
      return data.data;
    },
    refetchOnWindowFocus: true,
  });

  const { data: earnedSkills = [], isLoading: loadingEarned } = useQuery<EarnedSkill[]>({
    queryKey: 'my-earned-skills',
    queryFn: async () => {
      const { data } = await skillsApi.getMyEarned();
      return data.data;
    },
    refetchOnWindowFocus: true,
  });

  const { data: completedSessions = [] } = useQuery<Session[]>({
    queryKey: 'completed-sessions',
    queryFn: async () => {
      const { data } = await sessionsApi.getMy('completed');
      return data.data;
    },
    refetchOnWindowFocus: true,
  });

  const claimableSessions = useMemo(() => {
    const claimedIds = new Set(earnedSkills.map((s) => s.session));
    return completedSessions.filter((session) => {
      const requesterId =
        typeof session.requester === 'object' ? session.requester._id : session.requester;
      return requesterId === user?._id && !claimedIds.has(session._id);
    });
  }, [completedSessions, earnedSkills, user?._id]);

  const saveMutation = useMutation<void, { editingId: string | null; payload: any }>({
    mutationFn: async ({ editingId, payload }) => {
      if (editingId) {
        await skillsApi.update(editingId, payload);
      } else {
        await skillsApi.create(payload);
      }
    },
    onSuccess: (_data, { editingId }) => {
      toast.success(editingId ? 'Skill updated' : 'Skill created');
      setShowModal(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save skill');
    },
    invalidateKeys: ['my-skills', 'skills', 'dashboard'],
  });

  const deleteMutation = useMutation<void, string>({
    mutationFn: async (id) => {
      await skillsApi.delete(id);
    },
    onSuccess: () => toast.success('Skill deleted'),
    onError: () => toast.error('Failed to delete skill'),
    invalidateKeys: ['my-skills', 'skills', 'dashboard'],
  });

  const claimEarnedMutation = useMutation<void, string>({
    mutationFn: async (sessionId) => {
      await skillsApi.claimEarnedFromSession(sessionId, { isPublic: true });
    },
    onSuccess: () => {
      toast.success('Earned skill claimed. Certificate ready!');
      setShowClaimModal(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to claim earned skill');
    },
    invalidateKeys: ['my-earned-skills', 'completed-sessions', 'user-detail'],
  });

  const visibilityMutation = useMutation<void, { id: string; isPublic: boolean }>({
    mutationFn: async ({ id, isPublic }) => {
      await skillsApi.updateEarned(id, { isPublic });
    },
    onError: () => toast.error('Failed to update visibility'),
    invalidateKeys: ['my-earned-skills', 'user-detail'],
  });

  const deleteEarnedMutation = useMutation<void, string>({
    mutationFn: async (id) => {
      await skillsApi.deleteEarned(id);
    },
    onSuccess: () => toast.success('Earned skill removed'),
    onError: () => toast.error('Failed to remove earned skill'),
    invalidateKeys: ['my-earned-skills', 'user-detail'],
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingId(skill._id);
    setForm({
      name: skill.name,
      description: skill.description,
      category: skill.category,
      level: skill.level,
      type: skill.type,
      tags: skill.tags.join(', '),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const payload = {
      ...form,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    saveMutation.mutate({ editingId, payload });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this skill?')) return;
    deleteMutation.mutate(id);
  };

  const handleDeleteEarned = async (id: string) => {
    if (!confirm('Remove this earned skill from your profile?')) return;
    deleteEarnedMutation.mutate(id);
  };

  if (loading || loadingEarned) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const offers = skills.filter((s) => s.type === 'offer');
  const requests = skills.filter((s) => s.type === 'request');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Skills</h1>
          <p className="text-gray-500">Manage skills you offer, request, and earned</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowClaimModal(true)}
            className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Award className="h-4 w-4" />
            Claim Earned Skill
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Skill
          </button>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Award className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-800">Skills I Earned ({earnedSkills.length})</h2>
        </div>

        {earnedSkills.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
            No earned skills yet. Complete a session as a learner, then claim your certificate.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {earnedSkills.map((earned) => {
              const teacher = typeof earned.teacher === 'object' ? earned.teacher : null;
              return (
                <div key={earned._id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[earned.category]}`}>
                      {earned.category}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {earned.level}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{earned.skillName}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Taught by {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Instructor'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">Code: {earned.certificateCode}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => navigate(`/certificate/${earned._id}`)}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <FileBadge className="h-3.5 w-3.5" />
                      Certificate
                    </button>
                    <button
                      onClick={() =>
                        visibilityMutation.mutate({
                          id: earned._id,
                          isPublic: !earned.isPublic,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {earned.isPublic ? (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Public
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Private
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteEarned(earned._id)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Skills I Offer ({offers.length})
        </h2>
        {offers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
            No skills offered yet. Click "Add Skill" to get started!
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((skill) => (
              <SkillItem
                key={skill._id}
                skill={skill}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Skills I Want to Learn ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
            No skill requests yet. Add what you'd like to learn!
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((skill) => (
              <SkillItem
                key={skill._id}
                skill={skill}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Claim Earned Skill</h3>
              <button
                onClick={() => setShowClaimModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {claimableSessions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
                No completed learner sessions available to claim right now.
              </p>
            ) : (
              <div className="space-y-2">
                {claimableSessions.map((session) => {
                  const provider = typeof session.provider === 'object' ? session.provider : null;
                  const skill = typeof session.skill === 'object' ? session.skill : null;
                  return (
                    <div
                      key={session._id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {skill?.name || 'Session Skill'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Teacher: {provider ? `${provider.firstName} ${provider.lastName}` : 'Unknown'}
                        </p>
                      </div>
                      <button
                        onClick={() => claimEarnedMutation.mutate(session._id)}
                        disabled={claimEarnedMutation.isLoading}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Claim
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Skill' : 'Add Skill'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Skill Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as 'offer' | 'request',
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="offer">I Offer</option>
                    <option value="request">I Want</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as SkillCategory,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {SKILL_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Level
                  </label>
                  <select
                    value={form.level}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        level: e.target.value as SkillLevel,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {SKILL_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tags (comma separated)
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g. javascript, web, frontend"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saveMutation.isLoading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SkillItem({
  skill,
  onEdit,
  onDelete,
}: {
  skill: Skill;
  onEdit: (skill: Skill) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[skill.category]}`}
        >
          {skill.category}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(skill)}
            className="rounded p-1 text-gray-400 hover:text-indigo-600"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(skill._id)}
            className="rounded p-1 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <h3 className="font-semibold text-gray-900">{skill.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
        {skill.description}
      </p>
      <div className="mt-2 flex gap-2">
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {skill.level}
        </span>
      </div>
    </div>
  );
}
