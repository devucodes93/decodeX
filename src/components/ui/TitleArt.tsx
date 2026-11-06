import type { CSSProperties } from "react";
import art from "../../data/titleArt.json";
import "./TitleArt.css";

type ArtEntry = { src: string; w: number; h: number; lines: number };
const ART = art as Record<string, ArtEntry>;

type TitleArtProps = {
  /** Heading text. Must match a key in src/data/titleArt.json to show art. */
  text: string;
  /** "page" = large page titles, "section" = section headings. */
  size?: "page" | "section";
};

/**
 * Renders a title as the pre-rendered Pricedown artwork (see
 * scripts/render-titles.py), with the real text kept for screen readers and
 * search engines. Falls back to plain text when no artwork exists.
 * Place it INSIDE the heading element.
 */
export function TitleArt({ text, size = "section" }: TitleArtProps) {
  const entry = ART[text];
  if (!entry) return <>{text}</>;

  const style = {
    "--ar": entry.w / entry.h,
    "--lines": entry.lines,
  } as CSSProperties;

  return (
    <>
      <img
        className={`title-art title-art--${size}`}
        src={entry.src}
        width={entry.w}
        height={entry.h}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={style}
      />
      <span className="title-art-text">{text}</span>
    </>
  );
}
