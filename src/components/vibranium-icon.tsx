export function VibraniumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <polygon points="12,1.5 22,7.5 22,16.5 12,22.5 2,16.5 2,7.5" fill="#4c1d95" stroke="black" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#c4b5fd" strokeWidth="1.1" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="#c4b5fd" strokeWidth="1.1" />
      <circle cx="12" cy="12" r="1.4" fill="#c4b5fd" />
    </svg>
  );
}
