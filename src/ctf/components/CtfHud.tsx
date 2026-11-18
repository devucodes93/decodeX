import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { ASSETS } from "../../config/assets";

type Props = {
  /** Small label next to the logo, e.g. "Virtual CTF". */
  label: string;
  children?: ReactNode;
  onLogout?: () => void;
};

/** Black in-game style top bar used on every signed-in CTF screen. */
export function CtfHud({ label, children, onLogout }: Props) {
  return (
    <header className="ctf-hud">
      <div className="ctf-hud-brand">
        <img src={ASSETS.navIcon} alt="" className="ctf-hud-logo" />
        <span className="ctf-hud-name">DECODEX</span>
        <span className="ctf-hud-label">{label}</span>
      </div>
      <div className="ctf-hud-right">
        {children}
        {onLogout && (
          <button type="button" className="ctf-hud-btn" onClick={onLogout}>
            <LogOut size={15} aria-hidden="true" />
            <span>Log out</span>
          </button>
        )}
      </div>
    </header>
  );
}

/** Small HUD readout: label above a value. */
export function HudStat({ label, value, tone }: { label: string; value: ReactNode; tone?: "gold" | "pink" | "green" }) {
  return (
    <div className={`ctf-hud-stat${tone ? ` is-${tone}` : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
