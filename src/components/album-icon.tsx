export function AlbumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" className={className}>
      <path d="M12 5c-2.2-1.3-5-1.7-7-1v14c2-.7 4.8-.3 7 1V5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M12 5c2.2-1.3 5-1.7 7-1v14c-2-.7-4.8-.3-7 1V5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
