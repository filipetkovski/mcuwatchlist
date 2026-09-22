/** Original, stylized "iron mask under a green hood" illustration used as a card backdrop. */
export function DoomMask({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 240" aria-hidden="true" className={className} fill="none" strokeLinejoin="round" strokeLinecap="round">
      <defs>
        <linearGradient id="doom-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3e8ec" />
          <stop offset="0.55" stopColor="#a8b1b9" />
          <stop offset="1" stopColor="#6f7a84" />
        </linearGradient>
        <linearGradient id="doom-hood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c7a47" />
          <stop offset="1" stopColor="#0a3520" />
        </linearGradient>
      </defs>

      {/* hood and shoulders */}
      <path
        d="M100 6C44 6 12 54 18 124L4 236h192l-14-112C188 54 156 6 100 6Z"
        fill="url(#doom-hood)"
        stroke="#000"
        strokeWidth="5"
      />
      {/* hood folds */}
      <path d="M30 120c-2 40-8 80-14 112M170 120c2 40 8 80 14 112M52 70c-10 30-12 60-8 90M148 70c10 30 12 60 8 90" stroke="#000" strokeWidth="3" opacity="0.45" />
      {/* shadow inside the hood */}
      <path d="M100 26c-40 0-62 34-60 84 2 42 26 72 60 80 34-8 58-38 60-80 2-50-20-84-60-84Z" fill="#04140b" stroke="#000" strokeWidth="4" />

      {/* mask */}
      <path
        d="M100 40c-32 0-46 26-44 68 2 34 20 58 44 66 24-8 42-32 44-66 2-42-12-68-44-68Z"
        fill="url(#doom-steel)"
        stroke="#000"
        strokeWidth="5"
      />
      {/* brow ridge */}
      <path d="M60 92c14-12 26-14 40-8 14-6 26-4 40 8" stroke="#000" strokeWidth="5" />
      {/* eye slits with a green glow */}
      <path d="M66 100l28 5-3 11-25-6Z" fill="#050505" stroke="#000" strokeWidth="2" />
      <path d="M134 100l-28 5 3 11 25-6Z" fill="#050505" stroke="#000" strokeWidth="2" />
      <path d="M72 105l17 3-1 5-15-3Z" fill="#7dffa3" />
      <path d="M128 105l-17 3 1 5 15-3Z" fill="#7dffa3" />
      {/* nose */}
      <path d="M100 112l-7 26 7 5 7-5Z" fill="#7b858e" stroke="#000" strokeWidth="3" />
      {/* cheek plates */}
      <path d="M62 122c6 16 16 26 30 32M138 122c-6 16-16 26-30 32" stroke="#000" strokeWidth="3" opacity="0.55" />
      {/* mouth grille */}
      <rect x="83" y="152" width="34" height="14" rx="3" fill="#2b3238" stroke="#000" strokeWidth="3" />
      <path d="M91 153v12M100 153v12M109 153v12" stroke="#9aa4ad" strokeWidth="2" />
      {/* rivets */}
      <g fill="#dfe5ea" stroke="#000" strokeWidth="1.5">
        <circle cx="64" cy="112" r="3" />
        <circle cx="136" cy="112" r="3" />
        <circle cx="76" cy="146" r="2.6" />
        <circle cx="124" cy="146" r="2.6" />
        <circle cx="100" cy="60" r="2.6" />
      </g>
      {/* collar clasp */}
      <path d="M62 196h76l6 40H56Z" fill="#0d4a2a" stroke="#000" strokeWidth="4" />
      <circle cx="100" cy="210" r="9" fill="#a8b1b9" stroke="#000" strokeWidth="3.5" />
      <circle cx="100" cy="210" r="3.5" fill="#7dffa3" />
    </svg>
  );
}
