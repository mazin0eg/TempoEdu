import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, ArrowLeft, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { skillsApi } from '../../services/skills.service';
import type { CertificateData } from '../../types';
import { useQuery } from '../../lib/useQuery';
import BrandLogo from '../../components/common/BrandLogo';

export default function CertificatePage() {
  const { earnedSkillId } = useParams<{ earnedSkillId: string }>();
  const certificateRef = useRef<HTMLDivElement>(null);
  const pdfCertificateRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    const exportNode = pdfCertificateRef.current ?? certificateRef.current;
    if (!exportNode) return;

    setIsGeneratingPdf(true);
    try {
      if ('fonts' in document) {
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      }

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      let dataUrl: string;
      try {
        dataUrl = await toPng(exportNode, {
          cacheBust: true,
          pixelRatio,
          backgroundColor: '#ffffff',
        });
      } catch {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(exportNode, {
          scale: pixelRatio,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        dataUrl = canvas.toDataURL('image/png');
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const certWidthPx = exportNode.offsetWidth * pixelRatio;
      const certHeightPx = exportNode.offsetHeight * pixelRatio;

      const availableWidth = pageWidth - 12;
      const availableHeight = pageHeight - 12;

      const widthScale = availableWidth / certWidthPx;
      const heightScale = availableHeight / certHeightPx;
      const scale = Math.min(widthScale, heightScale);

      const imgWidth = certWidthPx * scale;
      const imgHeight = certHeightPx * scale;
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`certificate-${data.certificateCode}.pdf`);
      toast.success('Certificate PDF downloaded');
    } catch (error) {
      console.error('Failed to generate certificate PDF', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Download className="h-4 w-4" />
          {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
        </button>
      </div>

      <div
        ref={certificateRef}
        className="relative overflow-hidden rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 via-white to-cyan-50 p-8 shadow-xl print:shadow-none"
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-amber-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-12 h-52 w-52 rounded-full bg-cyan-200/40 blur-2xl" />

        <div className="relative rounded-xl border-2 border-amber-400/70 bg-white/80 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo showText={false} />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">EducateWithMe Platform</p>
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
              <p className="font-serif text-2xl text-gray-800">EducateWithMe</p>
              <p className="-mt-1 text-xs uppercase tracking-[0.2em] text-gray-500">Official Platform Signature</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export-only certificate template (inline styles for maximum renderer compatibility) */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          width: '1120px',
          background: '#ffffff',
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        <div
          ref={pdfCertificateRef}
          style={{
            width: '1080px',
            border: '1px solid #f1d197',
            borderRadius: '18px',
            padding: '30px',
            background:
              'linear-gradient(135deg, #fff7df 0%, #ffffff 50%, #e8f5ff 100%)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            color: '#143467',
          }}
        >
          <div
            style={{
              border: '2px solid rgba(225, 173, 71, 0.7)',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.9)',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
                  <rect x="2" y="2" width="44" height="44" rx="12" fill="#0f4fa8" />
                  <path d="M10 29C14 21 22 18 38 18" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                  <path d="M10 35C16 29 24 26 38 26" stroke="#7fc3ff" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="35" cy="34" r="4" fill="#ffffff" />
                </svg>
                <div>
                  <div style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#4b5f7c' }}>
                    EducateWithMe Platform
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 800, color: '#0f2b54' }}>
                    Certificate of Achievement
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '28px' }}>✓</div>
            </div>

            <p style={{ marginTop: '28px', textAlign: 'center', fontSize: '12px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#5d6b80' }}>
              This certifies that
            </p>
            <p style={{ marginTop: '10px', textAlign: 'center', fontSize: '52px', fontWeight: 700, color: '#0f2b54' }}>
              {data.learnerName}
            </p>

            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '20px', color: '#344f75' }}>
              has successfully completed training in
            </p>
            <p style={{ marginTop: '8px', textAlign: 'center', fontSize: '42px', fontWeight: 800, color: '#1f4ea3' }}>
              {data.skillName}
            </p>

            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '18px', color: '#344f75' }}>
              taught by <span style={{ fontWeight: 700, color: '#0f2b54' }}>{data.teacherName}</span>
            </p>

            <div
              style={{
                marginTop: '24px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '12px',
                borderRadius: '12px',
                background: '#f5faff',
                padding: '14px',
                fontSize: '15px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#5d6b80' }}>Level</div>
                <div style={{ marginTop: '4px', fontWeight: 700, textTransform: 'capitalize' }}>{data.level}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#5d6b80' }}>Category</div>
                <div style={{ marginTop: '4px', fontWeight: 700, textTransform: 'capitalize' }}>{data.category}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#5d6b80' }}>Issued</div>
                <div style={{ marginTop: '4px', fontWeight: 700 }}>{format(new Date(data.issuedAt), 'MMMM d, yyyy')}</div>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#5d6b80' }}>Certificate Code</div>
                <div style={{ marginTop: '4px', fontFamily: 'monospace', fontWeight: 700 }}>{data.certificateCode}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '30px', fontWeight: 700, color: '#1a365f' }}>EducateWithMe</div>
                <div style={{ marginTop: '-2px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5d6b80' }}>
                  Official Platform Signature
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
