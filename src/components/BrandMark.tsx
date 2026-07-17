interface BrandMarkProps {
  className?: string;
  title?: string;
}

export default function BrandMark({ className = "h-10 w-10", title = "ConcurseiroOS" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="concurseiroos-brand-gradient" x1="14" y1="12" x2="82" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="0.52" stopColor="#2563EB" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>
        <radialGradient id="concurseiroos-brand-surface" cx="0" cy="0" r="1" gradientTransform="translate(31 23) rotate(51) scale(83)">
          <stop stopColor="#18181B" />
          <stop offset="1" stopColor="#09090B" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="92" height="92" rx="24" fill="url(#concurseiroos-brand-surface)" />
      <rect x="3" y="3" width="90" height="90" rx="23" fill="none" stroke="#27272A" strokeWidth="2" />
      <path
        d="M68.5 28.5C63.3 23.3 56.1 20 48 20C32.5 20 20 32.5 20 48s12.5 28 28 28c8.1 0 15.3-3.3 20.5-8.5"
        fill="none"
        stroke="url(#concurseiroos-brand-gradient)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path d="M42 48.5l5.5 5.5L61 39.5" fill="none" stroke="#F4F4F5" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="75" cy="24" r="5" fill="#22C55E" />
    </svg>
  );
}
