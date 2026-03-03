interface ChineseLanternProps {
  className?: string;
}

export default function ChineseLantern({ className = 'h-6 w-6' }: ChineseLanternProps) {
  return (
    <svg
      viewBox="0 0 64 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hanging string */}
      <line x1="32" y1="0" x2="32" y2="14" stroke="#D4A017" strokeWidth="2.5" strokeLinecap="round" />

      {/* Top cap */}
      <rect x="20" y="14" width="24" height="6" rx="2" fill="#D4A017" />

      {/* Lantern body - main red shape */}
      <ellipse cx="32" cy="42" rx="22" ry="22" fill="#DC2626" />

      {/* Lantern ribs (gold lines) */}
      <ellipse cx="32" cy="42" rx="22" ry="22" fill="none" stroke="#D4A017" strokeWidth="2" />
      <ellipse cx="32" cy="42" rx="11" ry="22" fill="none" stroke="#D4A017" strokeWidth="1.5" />
      <line x1="10" y1="42" x2="54" y2="42" stroke="#D4A017" strokeWidth="1.2" opacity="0.5" />

      {/* Bottom cap */}
      <rect x="20" y="62" width="24" height="6" rx="2" fill="#D4A017" />

      {/* Knot ornament */}
      <circle cx="32" cy="74" r="3.5" fill="none" stroke="#D4A017" strokeWidth="2" />
      <line x1="29" y1="74" x2="35" y2="74" stroke="#D4A017" strokeWidth="1.5" />
      <line x1="32" y1="71" x2="32" y2="77" stroke="#D4A017" strokeWidth="1.5" />

      {/* Tassel */}
      <line x1="32" y1="77" x2="32" y2="80" stroke="#D4A017" strokeWidth="2" />
      <line x1="28" y1="80" x2="28" y2="92" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="80" x2="30" y2="94" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="80" x2="32" y2="95" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="34" y1="80" x2="34" y2="94" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="80" x2="36" y2="92" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
