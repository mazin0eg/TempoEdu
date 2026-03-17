import { Link, useParams } from 'react-router-dom';
import { Download, ArrowLeft, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { skillsApi } from '../../services/skills.service';
import type { CertificateData } from '../../types';
import { useQuery } from '../../lib/useQuery';
import BrandLogo from '../../components/common/BrandLogo';

export default function CertificatePage() {
  const { earnedSkillId } = useParams<{ earnedSkillId: string }>();

  const { data, isLoading } = useQuery<CertificateData>({
    queryKey: `certificate-${earnedSkillId}`,
    queryFn: async () => {
      const res = await skillsApi.getCertificateData(earnedSkillId!);
      return res.data.data;
    },
    enabled: !!earnedSkillId,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-gray-500">Certificate not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/my-skills"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Skills
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Download className="h-4 w-4" /> Download / Print
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 via-white to-cyan-50 p-8 shadow-xl print:shadow-none">
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-amber-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-12 h-52 w-52 rounded-full bg-cyan-200/40 blur-2xl" />

        <div className="relative rounded-xl border-2 border-amber-400/70 bg-white/80 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo showText={false} />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">TempoEdu Platform</p>
                <h1 className="font-serif text-2xl font-bold text-gray-900">Certificate of Achievement</h1>
              </div>
            </div>
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
          </div>

          <p className="text-center text-sm uppercase tracking-[0.25em] text-gray-500">This certifies that</p>
          <p className="mt-3 text-center font-serif text-4xl font-semibold text-gray-900">{data.learnerName}</p>

          <p className="mt-6 text-center text-gray-700">
            has successfully completed training in
          </p>
          <p className="mt-2 text-center font-serif text-3xl font-bold text-indigo-800">{data.skillName}</p>

          <p className="mt-5 text-center text-sm text-gray-700">
            taught by <span className="font-semibold text-gray-900">{data.teacherName}</span>
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500">Level</p>
              <p className="font-semibold capitalize">{data.level}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500">Category</p>
              <p className="font-semibold capitalize">{data.category}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500">Issued</p>
              <p className="font-semibold">{format(new Date(data.issuedAt), 'MMMM d, yyyy')}</p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500">Certificate Code</p>
              <p className="font-mono text-sm font-semibold text-gray-900">{data.certificateCode}</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-2xl text-gray-800">TempoEdu</p>
              <p className="-mt-1 text-xs uppercase tracking-[0.2em] text-gray-500">Official Platform Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
