import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  Globe,
  ArrowLeft,
  MessageSquare,
  GraduationCap,
  BookOpen,
  Calendar,
  Award,
  Users,
  FileBadge,
} from 'lucide-react';
import { format } from 'date-fns';
import { usersApi } from '../../services/users.service';
import { skillsApi } from '../../services/skills.service';
import { reviewsApi } from '../../services/reviews.service';
import { chatApi } from '../../services/chat.service';
import { useAuth } from '../../context/AuthContext';
import type { User, Skill, Review, EarnedSkill } from '../../types';
import { CATEGORY_COLORS } from '../../lib/constants';
import { useQuery } from '../../lib/useQuery';

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading: loading } = useQuery<{
    profile: User;
    skills: Skill[];
    reviews: Review[];
    earnedSkills: EarnedSkill[];
  }>({
    queryKey: `user-detail-${userId}`,
    queryFn: async () => {
      const [userRes, skillsRes, reviewsRes, earnedRes] = await Promise.all([
        usersApi.getById(userId!),
        skillsApi.getAll({ owner: userId }),
        reviewsApi.getByUser(userId!),
        skillsApi.getPublicEarned(userId!),
      ]);
      return {
        profile: userRes.data.data,
        skills: skillsRes.data.data.skills,
        reviews: reviewsRes.data.data,
        earnedSkills: earnedRes.data.data,
      };
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
  });

  const profile = data?.profile ?? null;
  const skills = data?.skills ?? [];
  const reviews = data?.reviews ?? [];
  const earnedSkills = data?.earnedSkills ?? [];

  const handleStartChat = async () => {
    if (!userId) return;
    try {
      const { data } = await chatApi.createConversation(userId);
      navigate(`/chat/${data.data._id}`);
    } catch {
      navigate('/chat');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-gray-500">User not found</p>
      </div>
    );
  }

  const offers = skills.filter((s) => s.type === 'offer');
  const requests = skills.filter((s) => s.type === 'request');

  return (
    <div className="space-y-6">
      <Link
        to="/skills"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {/* ── Profile Header ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-3xl font-bold text-indigo-600">
            {profile.firstName[0]}
            {profile.lastName[0]}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.firstName} {profile.lastName}
            </h1>

            {profile.bio && (
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                {profile.bio}
              </p>
            )}

            {profile.languages && profile.languages.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {profile.languages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                  >
                    <Globe className="h-3 w-3" />
                    {lang}
                  </span>
                ))}
              </div>
            )}

            {/* Action */}
            {me?._id !== profile._id && (
              <button
                onClick={handleStartChat}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <MessageSquare className="h-4 w-4" />
                Send Message
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Star className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            {profile.reputationScore?.toFixed(1) || '0.0'}
          </p>
          <p className="text-xs text-gray-500">Rating</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Award className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            {profile.totalReviews || 0}
          </p>
          <p className="text-xs text-gray-500">Reviews</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{skills.length}</p>
          <p className="text-xs text-gray-500">Skills</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <Calendar className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            {format(new Date(profile.createdAt), 'MMM yyyy')}
          </p>
          <p className="text-xs text-gray-500">Member since</p>
        </div>
      </div>

      {/* ── Skills Offered ── */}
      {offers.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Skills Offered
            </h2>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {offers.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((skill) => (
              <Link
                key={skill._id}
                to={`/skills/${skill._id}`}
                className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                {skill.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {skill.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[skill.category]}`}
                  >
                    {skill.category}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {skill.level}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Skills Wanted ── */}
      {requests.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Skills Wanted
            </h2>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              {requests.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((skill) => (
              <Link
                key={skill._id}
                to={`/skills/${skill._id}`}
                className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                {skill.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {skill.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[skill.category]}`}
                  >
                    {skill.category}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {skill.level}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Earned Skills ── */}
      {earnedSkills.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Earned Skills
            </h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {earnedSkills.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {earnedSkills.map((earned) => {
              const teacher = typeof earned.teacher === 'object' ? earned.teacher : null;
              return (
                <Link
                  key={earned._id}
                  to={`/certificate/${earned._id}`}
                  className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[earned.category]}`}
                    >
                      {earned.category}
                    </span>
                    <FileBadge className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{earned.skillName}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Taught by {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Instructor'}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">{earned.certificateCode}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {offers.length === 0 && requests.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No skills listed yet</p>
        </div>
      )}

      {/* ── Reviews ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {reviews.length}
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
            <Star className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const reviewer =
                typeof review.reviewer === 'object' ? review.reviewer : null;
              return (
                <div
                  key={review._id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {reviewer && (
                        <Link
                          to={`/users/${reviewer._id}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-200"
                        >
                          {reviewer.firstName[0]}
                          {reviewer.lastName[0]}
                        </Link>
                      )}
                      <div>
                        {reviewer && (
                          <Link
                            to={`/users/${reviewer._id}`}
                            className="text-sm font-semibold text-gray-900 hover:text-indigo-600"
                          >
                            {reviewer.firstName} {reviewer.lastName}
                          </Link>
                        )}
                        <p className="text-xs text-gray-400">
                          {format(new Date(review.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-gray-600">
                      {review.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
