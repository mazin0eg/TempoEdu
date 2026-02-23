import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Calendar,
  Clock,
  MessageSquare,
  User as UserIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { skillsApi } from '../../services/skills.service';
import { sessionsApi } from '../../services/sessions.service';
import { chatApi } from '../../services/chat.service';
import { reviewsApi } from '../../services/reviews.service';
import { useAuth } from '../../context/AuthContext';
import type { Skill, Review } from '../../types';
import { CATEGORY_COLORS } from '../../lib/constants';

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    scheduledAt: '',
    duration: 1,
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const { data } = await skillsApi.getById(id);
        setSkill(data.data);

        if (typeof data.data.user === 'object') {
          const reviewRes = await reviewsApi.getByUser(data.data.user._id);
          setReviews(reviewRes.data.data);
        }
      } catch {
        toast.error('Skill not found');
        navigate('/skills');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleBookSession = async (e: FormEvent) => {
    e.preventDefault();
    if (!skill || typeof skill.user !== 'object') return;

    setSubmitting(true);
    try {
      await sessionsApi.create({
        provider: skill.user._id,
        skill: skill._id,
        scheduledAt: new Date(bookingForm.scheduledAt).toISOString(),
        duration: bookingForm.duration,
        message: bookingForm.message,
      });
      toast.success('Session request sent!');
      setShowBooking(false);
      navigate('/sessions');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to book session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!skill || typeof skill.user !== 'object') return;
    try {
      const { data } = await chatApi.createConversation(skill.user._id);
      navigate(`/chat/${data.data._id}`);
    } catch {
      toast.error('Failed to start conversation');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!skill) return null;

  const owner = typeof skill.user === 'object' ? skill.user : null;
  const isOwner = owner?._id === user?._id;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${CATEGORY_COLORS[skill.category]}`}
              >
                {skill.category}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {skill.level}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  skill.type === 'offer'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {skill.type === 'offer' ? 'Offering' : 'Requesting'}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900">{skill.name}</h1>
            <p className="mt-3 text-gray-600 leading-relaxed">
              {skill.description}
            </p>

            {skill.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {skill.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Reviews ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 5).map((review) => {
                  const reviewer =
                    typeof review.reviewer === 'object'
                      ? review.reviewer
                      : null;
                  return (
                    <div
                      key={review._id}
                      className="border-b border-gray-100 pb-4 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                            {reviewer
                              ? `${reviewer.firstName[0]}${reviewer.lastName[0]}`
                              : '??'}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {reviewer
                              ? `${reviewer.firstName} ${reviewer.lastName}`
                              : 'User'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300'
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
                      <p className="mt-1 text-xs text-gray-400">
                        {format(new Date(review.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Owner Card */}
          {owner && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
                  {owner.firstName[0]}
                  {owner.lastName[0]}
                </div>
                <div>
                  <Link
                    to={`/users/${owner._id}`}
                    className="font-semibold text-gray-900 hover:text-indigo-600"
                  >
                    {owner.firstName} {owner.lastName}
                  </Link>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {owner.reputationScore || 'New'}
                    {owner.totalReviews > 0 && (
                      <span>({owner.totalReviews} reviews)</span>
                    )}
                  </div>
                </div>
              </div>

              {owner.bio && (
                <p className="mt-3 text-sm text-gray-500">{owner.bio}</p>
              )}

              {owner.languages.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500">Languages</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {owner.languages.map((lang) => (
                      <span
                        key={lang}
                        className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!isOwner && owner && skill.type === 'offer' && (
            <div className="space-y-2">
              <button
                onClick={() => setShowBooking(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Book a Session
              </button>
              <button
                onClick={handleStartChat}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Book a Session
            </h3>
            <form onSubmit={handleBookSession} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={bookingForm.scheduledAt}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      scheduledAt: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Duration (hours) = credits
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={bookingForm.duration}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        duration: Number(e.target.value),
                      })
                    }
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    Cost: {bookingForm.duration} credit
                    {bookingForm.duration > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Message (optional)
                </label>
                <textarea
                  value={bookingForm.message}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      message: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Tell the provider what you'd like to learn..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBooking(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
