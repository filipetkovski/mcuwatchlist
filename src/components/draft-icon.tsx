export function DraftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" className={className}>
      <path d="m14.5 3.5 6 6-2 2-6-6z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="m12.5 5.5 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="m3.5 14.5 6-6 4 4-6 6z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M3 21h7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M15 15v3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
