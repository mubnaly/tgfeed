import { cn } from '@/lib/utils';

/** The Facebook 'f' mark in its blue square; sized to pair with TgGlyph and HnGlyph. */
export function FbGlyph({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('flex size-5 items-center justify-center rounded bg-[#1877F2] text-white font-bold text-xs select-none', className)}
    >
      f
    </span>
  );
}
