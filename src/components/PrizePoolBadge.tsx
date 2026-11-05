import { motion, useReducedMotion } from "framer-motion";
import { EVENT } from "../config/event";
import "./PrizePoolBadge.css";

/**
 * Sticker-style prize pool callout that matches the DECODEX logo
 * (hot pink, cream, heavy black outlines, hard offset shadows).
 * Hidden when no prize pool is configured.
 */
export function PrizePoolBadge() {
  const reduce = useReducedMotion();
  const pool = EVENT.prizePool?.trim();
  if (!pool) return null;

  // Split "₹50,000" into the currency symbol and the number so the symbol
  // can use a font that actually contains the glyph.
  const match = pool.match(/^(\D*)(.*)$/);
  const symbol = match?.[1] ?? "";
  const amount = match?.[2] ?? pool;

  return (
    <motion.div
      className="ppool"
      initial={reduce ? false : { opacity: 0, scale: 1.35, rotate: -8 }}
      animate={{ opacity: 0.94, scale: 1, rotate: -3 }}
      transition={{ delay: 0.9, type: "spring", stiffness: 420, damping: 18 }}
      aria-label={`Total prize pool ${pool}`}
      role="note"
    >
      <span className="ppool-label" aria-hidden="true">
        Total prize pool
      </span>
      <span className="ppool-amount" aria-hidden="true">
        {symbol && <span className="ppool-cur">{symbol}</span>}
        {amount}
      </span>
    </motion.div>
  );
}
