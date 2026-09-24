export function TicTacToeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" className={className}>
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M4.5 4.5l3 3M7.5 4.5l-3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="18" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}
