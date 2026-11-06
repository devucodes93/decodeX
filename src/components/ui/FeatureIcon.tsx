import type { ReactNode } from "react";

/**
 * DecodeX feature icon set — custom vector icons, one consistent style:
 * 48×48 grid, 2px rounded strokes in currentColor, with a faint tinted fill
 * on the main shape for depth. Colour comes from the parent (`color`), so
 * icons pick up each card's accent automatically.
 *
 * Usage: <FeatureIcon type="satellite" />
 * Add a new icon by adding an entry to ICONS.
 */

const TINT = { fill: "currentColor", fillOpacity: 0.14 } as const;

const ICONS = {
  satellite: (
    <>
      <path d="M8 20a14.6 14.6 0 0 0 20 20Z" {...TINT} />
      <path d="M8 20a14.6 14.6 0 0 0 20 20Z" />
      <path d="m18 30 7-7" />
      <circle cx="26.5" cy="21.5" r="1.8" fill="currentColor" stroke="none" />
      <path d="M33 26a11 11 0 0 0-11-11" />
      <path d="M41 26A19 19 0 0 0 22 7" />
      <path d="M14 36 9 43M6 43h10" />
    </>
  ),
  flag: (
    <>
      <path d="M12 9c4-3 8-3 12 0s8 3 12 0v17c-4 3-8 3-12 0s-8-3-12 0Z" {...TINT} />
      <path d="M12 9c4-3 8-3 12 0s8 3 12 0v17c-4 3-8 3-12 0s-8-3-12 0" />
      <path d="M12 43V6" />
      <path d="M8 43h8" />
    </>
  ),
  analytics: (
    <>
      <rect x="12" y="30" width="5" height="10" rx="1" {...TINT} stroke="none" />
      <rect x="21" y="25" width="5" height="15" rx="1" {...TINT} stroke="none" />
      <rect x="30" y="20" width="5" height="20" rx="1" {...TINT} stroke="none" />
      <path d="M6 6v36h36" />
      <path d="m11 30 9-9 6 5 13-13" />
      <path d="M31 13h8v8" />
    </>
  ),
  trophy: (
    <>
      <path d="M15 8h18v11a9 9 0 0 1-18 0Z" {...TINT} />
      <path d="M15 8h18v11a9 9 0 0 1-18 0Z" />
      <path d="M15 12H9a6 6 0 0 0 6.6 9.5M33 12h6a6 6 0 0 1-6.6 9.5" />
      <path d="M24 28v6" />
      <path d="M17 34h14v6H17z" />
      <path d="M13 40h22" />
    </>
  ),
  graduation: (
    <>
      <path d="m4 18 20-9 20 9-20 9Z" {...TINT} />
      <path d="m4 18 20-9 20 9-20 9Z" />
      <path d="M12 22v9c0 3 5.4 6 12 6s12-3 12-6v-9" />
      <path d="M44 18v11" />
    </>
  ),
  users: (
    <>
      <circle cx="18" cy="16" r="6.5" {...TINT} />
      <circle cx="18" cy="16" r="6.5" />
      <path d="M5 40c0-7.2 5.8-12 13-12s13 4.8 13 12" />
      <path d="M30 9.6a6 6 0 0 1 0 11.8" />
      <path d="M34 28.6c5 1.4 9 5.2 9 11.4" />
    </>
  ),
  pin: (
    <>
      <path d="M24 43S11 31.5 11 20a13 13 0 0 1 26 0c0 11.5-13 23-13 23Z" {...TINT} />
      <path d="M24 43S11 31.5 11 20a13 13 0 0 1 26 0c0 11.5-13 23-13 23Z" />
      <circle cx="24" cy="20" r="5" />
    </>
  ),
  monitor: (
    <>
      <rect x="8" y="9" width="32" height="22" rx="2" {...TINT} />
      <rect x="8" y="9" width="32" height="22" rx="2" />
      <path d="M4 36h40l-3 5H7Z" />
      <path d="M14 20h6M14 25h12" />
    </>
  ),
  calendar: (
    <>
      <rect x="6" y="10" width="36" height="32" rx="3" {...TINT} />
      <rect x="6" y="10" width="36" height="32" rx="3" />
      <path d="M6 19h36M16 6v8M32 6v8" />
      <path d="M14 26h4M22 26h4M30 26h4M14 33h4M22 33h4" />
    </>
  ),
  ticket: (
    <>
      <path d="M5 14h38v6a4 4 0 0 0 0 8v6H5v-6a4 4 0 0 0 0-8Z" {...TINT} />
      <path d="M5 14h38v6a4 4 0 0 0 0 8v6H5v-6a4 4 0 0 0 0-8Z" />
      <path d="M31 14v20" strokeDasharray="2.5 3" />
      <path d="M12 21h12M12 27h8" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type FeatureIconType = keyof typeof ICONS;

type FeatureIconProps = {
  type: FeatureIconType;
  className?: string;
  /** Rendered size in px (default 48). */
  size?: number;
};

export function FeatureIcon({ type, className, size = 48 }: FeatureIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[type]}
    </svg>
  );
}
