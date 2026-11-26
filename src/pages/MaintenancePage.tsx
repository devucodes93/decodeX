import { useEffect } from "react";
import { motion } from "framer-motion";
import { Wrench } from "lucide-react";
import { EVENT } from "../config/event";
import { ASSETS } from "../config/assets";
import { TitleArt } from "../components/ui/TitleArt";
import "./MaintenancePage.css";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Shown for every public page while MAINTENANCE is on (src/config/event.ts).
 * Stand-alone: no site header, footer or intro. The hidden CTF portal and
 * control room keep working.
 */
export default function MaintenancePage() {
  useEffect(() => {
    document.title = `Under maintenance | ${EVENT.name}`;
    // Keep the maintenance text out of search results.
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <main className="mt">
      <div className="mt-bg" aria-hidden="true">
        <img src={ASSETS.gtaCity} alt="" />
      </div>

      <div className="mt-tape mt-tape--top" aria-hidden="true">
        <div className="mt-tape-run">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i}>Under maintenance</span>
          ))}
        </div>
      </div>

      <motion.section
        className="mt-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
      >
        <img className="mt-logo" src={ASSETS.title} alt={EVENT.name} width={2245} height={922} draggable={false} />

        <span className="mt-pill">
          <Wrench size={14} aria-hidden="true" /> Pit stop
        </span>

        <h1 className="mt-title">
          <TitleArt text="Under Maintenance" size="page" />
        </h1>

        <p className="mt-text">
          We're tuning up the {EVENT.name} site. It'll be back on the road shortly. Thanks for your patience.
        </p>

        <div className="mt-progress" aria-hidden="true">
          <i />
        </div>
      </motion.section>

      <div className="mt-tape mt-tape--bottom" aria-hidden="true">
        <div className="mt-tape-run">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i}>Back soon</span>
          ))}
        </div>
      </div>
    </main>
  );
}
