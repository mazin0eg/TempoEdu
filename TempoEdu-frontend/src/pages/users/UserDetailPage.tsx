import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Star, Coins, MapPin, Globe, ArrowLeft, MessageSquare } from 'lucide-react';
import { usersApi } from '../../services/users.service';
import { skillsApi } from '../../services/skills.service';
import { chatApi } from '../../services/chat.service';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { User, Skill } from '../../types';

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      try {
        const { data } = await usersApi.getById(userId);
        setProfile(data.data);
        // Fetch that user's skills
        const sRes = await skillsApi.getAll({ owner: userId });
        setSkills(sRes.data.data.skills);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600">
            {profile.firstName[0]}
            {profile.lastName[0]}
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {profile.firstName} {profile.lastName}
          </h1>

          <div className="mt-3 flex justify-center gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-600">
                <Star className="h-4 w-4 fill-amber-400" />
                <span className="font-semibold">
                  {profile.reputationScore?.toFixed(1) || '0.0'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                ({profile.totalReviews} reviews)
              </p>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm text-gray-600">{profile.bio}</p>
          )}

          {profile.languages && profile.languages.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1">
              {profile.languages.map((lang) => (
                <span
                  key={lang}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                >
                  <Globe className="mr-1 inline h-3 w-3" />
                  {lang}
                </span>
              ))}
            </div>
          )}

          {me?._id !== profile._id && (
            <button
              onClick={handleStartChat}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <MessageSquare className="h-4 w-4" />
              Send Message
            </button>
          )}
        </div>

        {/* Skills */}
        <div className="lg:col-span-2 space-y-6">
          {offers.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Skills Offered
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {offers.map((skill) => (
                  <Link
                    key={skill._id}
                    to={`/skills/${skill._id}`}
                    className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {skill.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">
                        {skill.category}
                      </span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                        {skill.level}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {requests.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Skills Wanted
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {requests.map((skill) => (
                  <Link
                    key={skill._id}
                    to={`/skills/${skill._id}`}
                    className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {skill.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-700">
                        {skill.category}
                      </span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                        {skill.level}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {offers.length === 0 && requests.length === 0 && (
            <p className="py-8 text-center text-gray-500">
              No skills listed yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
