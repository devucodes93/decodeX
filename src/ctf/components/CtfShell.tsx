import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { useNoIndex } from "../hooks";
import { isBackendConfigured } from "../api";
import "../ctf.css";
import "../ctf-player.css";

type Props = {
  /** Background key art behind the page. */
  art?: string;
  /** Where the art is anchored (CSS object-position). */
  artPosition?: string;
  /** "dim" = darker plate for dense screens. */
  tone?: "cinema" | "dim";
  title: string;
  className?: string;
  children: ReactNode;
};

/** Full-screen wrapper for every hidden CTF page (no site header/footer). */
export function CtfShell({ art, artPosition = "center", tone = "cinema", title, className, children }: Props) {
  useNoIndex();
  useEffect(() => {
    document.title = `${title} | DECODEX CTF`;
  }, [title]);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`ctf ctf--${tone}${className ? ` ${className}` : ""}`}>
        {art && (
          <div className="ctf-bg" aria-hidden="true">
            <img src={art} alt="" style={{ objectPosition: artPosition }} />
          </div>
        )}
        <div className="ctf-grain" aria-hidden="true" />
        {!isBackendConfigured && (
          <div className="ctf-setup-banner" role="alert">
            <b>Backend not connected.</b> Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to{" "}
            <code>.env</code> (see backend/README.md), then restart the dev server.
          </div>
        )}
        {children}
      </div>
    </MotionConfig>
  );
}
