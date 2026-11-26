import { memo, type CSSProperties } from "react";

/**
 * Generated team badge: 1-2 initials on a colour + pattern derived from the
 * team name. Deterministic (same name -> same badge on every screen and
 * render), so teams without logos still get a recognisable identity.
 */

/** FNV-1a 32-bit hash of the name. */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (const ch of text) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * "Null_Byt3" -> "NB", "CodeFreaks" -> "CF", "Noobies" -> "N",
 * "getpwnedd" -> "G", "Kepler's stars" -> "KS". Never empty.
 */
export function teamInitials(name: string) {
  const words = name
    .normalize("NFKC")
    .replace(/['’`]/g, "")
    // split camelCase: "CodeFreaks" -> "Code Freaks"
    .replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const letters = words.slice(0, 2).map((w) => Array.from(w)[0]);
  return (letters.join("") || "#").toUpperCase();
}

const PATTERNS = [
  // diagonal stripes
  (a: string) => `repeating-linear-gradient(135deg, ${a} 0 2px, transparent 2px 9px)`,
  // concentric rings
  (a: string) => `repeating-radial-gradient(circle at 30% 25%, ${a} 0 1.5px, transparent 1.5px 8px)`,
  // dot grid
  (a: string) => `radial-gradient(${a} 1.4px, transparent 1.6px) 0 0 / 9px 9px`,
  // chevrons
  (a: string) =>
    `linear-gradient(135deg, ${a} 25%, transparent 25%) -6px 0 / 12px 12px, linear-gradient(225deg, ${a} 25%, transparent 25%) -6px 0 / 12px 12px`,
  // split field
  (a: string) => `linear-gradient(115deg, transparent 52%, ${a} 52%)`,
];

export function teamTheme(name: string) {
  const h = hash(name.trim().toLowerCase());
  const hue = h % 360;
  const hue2 = (hue + 35 + ((h >>> 9) % 50)) % 360;
  return {
    hue,
    pattern: PATTERNS[(h >>> 17) % PATTERNS.length]("rgba(255, 255, 255, 0.13)"),
    from: `hsl(${hue} 62% 44%)`,
    to: `hsl(${hue2} 70% 22%)`,
    ring: `hsl(${hue} 85% 72% / 0.55)`,
  };
}

type Props = {
  name: string;
  /** Diameter: px, or any CSS length such as "clamp(48px, 8vh, 90px)". */
  size?: number | string;
  className?: string;
};

export const TeamAvatar = memo(function TeamAvatar({ name, size = 44, className }: Props) {
  const t = teamTheme(name);
  const initials = teamInitials(name);
  const style = {
    "--ta-size": typeof size === "number" ? `${size}px` : size,
    "--ta-k": initials.length > 1 ? 0.4 : 0.48,
    "--ta-ring": t.ring,
    background: `${t.pattern}, linear-gradient(145deg, ${t.from}, ${t.to})`,
  } as CSSProperties;

  return (
    <span className={`team-avatar${className ? ` ${className}` : ""}`} style={style} aria-hidden="true">
      <span className="team-avatar-txt">{initials}</span>
    </span>
  );
});
