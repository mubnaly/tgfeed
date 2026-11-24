import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * نافع (Nafi') Distinctive Logo:
 * Represents distillation of knowledge into beneficial essence (نفع وفائدة).
 * Features a modern geometric crest with radiant emerald/teal gradients
 * and a central glowing golden spark of distilled wisdom.
 */
export function NafiLogo({ className, size = 24, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 select-none transition-transform duration-200 hover:scale-105', className)}
      aria-label="شعار نافع"
      {...props}
    >
      <defs>
        <linearGradient id="nafi-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="nafi-leaf-left" x1="12" y1="14" x2="34" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="nafi-leaf-right" x1="52" y1="14" x2="30" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="nafi-spark" x1="32" y1="18" x2="32" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="nafi-glow" x="20" y="14" width="24" height="36" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Rounded squircle backdrop */}
      <rect width="64" height="64" rx="16" fill="url(#nafi-bg)" />
      <rect width="62" height="62" x="1" y="1" rx="15" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />

      {/* Left wing / leaf of benefit */}
      <path
        d="M32 49 C23 45 15 36 15 25 C15 17 22 13 28 17 C32 20 32 28 32 35 Z"
        fill="url(#nafi-leaf-left)"
        fillOpacity="0.92"
      />

      {/* Right wing / leaf of benefit */}
      <path
        d="M32 49 C41 45 49 36 49 25 C49 17 42 13 36 17 C32 20 32 28 32 35 Z"
        fill="url(#nafi-leaf-right)"
        fillOpacity="0.92"
      />

      {/* Central golden core of distilled wisdom */}
      <path
        d="M32 17 L36.5 28 L32 43 L27.5 28 Z"
        fill="url(#nafi-spark)"
        filter="url(#nafi-glow)"
      />

      {/* Subtle diamond accent at top */}
      <circle cx="32" cy="13.5" r="2.2" fill="#fde68a" />
    </svg>
  );
}

export function NafiWordmark({ className, subtitle }: { className?: string; subtitle?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <NafiLogo size={28} className="shadow-sm" />
      <div className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight text-foreground">نافِع</span>
        {subtitle && (
          <span className="mt-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            خلاصة النفع والإفادة
          </span>
        )}
      </div>
    </div>
  );
}
