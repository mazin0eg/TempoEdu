interface BrandLogoProps {
  showText?: boolean;
  compact?: boolean;
  className?: string;
}

export default function BrandLogo({
  showText = true,
  compact = false,
  className = '',
}: BrandLogoProps) {
  const markSize = compact ? 'h-9 w-9' : 'h-12 w-12';

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div className={`relative ${markSize} shrink-0`}>
        <svg
          viewBox="0 0 48 48"
          className="h-full w-full rounded-xl shadow-lg shadow-blue-300/35"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="44" height="44" rx="12" fill="#0f4fa8" />
          <path
            d="M10 29C14 21 22 18 38 18"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M10 35C16 29 24 26 38 26"
            stroke="#7fc3ff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="35" cy="34" r="4" fill="#ffffff" />
        </svg>
      </div>

      {showText && (
        <div className="leading-none">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-700">
            EducateWithMe
          </p>
          <p className="text-xl font-extrabold text-blue-950">Live Exchange</p>
        </div>
      )}
    </div>
  );
}
