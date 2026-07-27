/**
 * Signature motif: two threads weaving into one — standing in for
 * two lives joining. Used at section boundaries, never as pure
 * decoration on its own.
 */
export function Interlace({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 16"
      className={`w-full max-w-xs h-4 ${className}`}
      aria-hidden="true"
    >
      <path
        d="M0 8 C 20 8, 20 2, 40 2 S 60 8, 80 8 S 100 14, 120 14 S 140 8, 160 8 S 180 2, 200 2 S 220 8, 240 8"
        fill="none"
        stroke="var(--gold-soft)"
        strokeWidth="1"
        opacity="0.7"
      />
      <path
        d="M0 8 C 20 8, 20 14, 40 14 S 60 8, 80 8 S 100 2, 120 2 S 140 8, 160 8 S 180 14, 200 14 S 220 8, 240 8"
        fill="none"
        stroke="var(--jade)"
        strokeWidth="1"
        opacity="0.8"
      />
    </svg>
  );
}
