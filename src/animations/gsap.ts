import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Mobile browsers resize the viewport when the address bar shows/hides while
// scrolling. Without this, every ScrollTrigger recalculates mid-scroll, which
// shows up as jumps/flicker on phones.
ScrollTrigger.config({ ignoreMobileResize: true });

/** Phones / tablets: no hover and a coarse (finger) pointer. */
export const isTouch = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: none), (pointer: coarse)").matches;

/**
 * Scrub setting for scroll-linked animations: `true` = locked directly to
 * the scroll position. A numeric scrub adds a catch-up delay, so the
 * animation kept moving AFTER the user stopped scrolling (very visible on
 * phones). Use this everywhere instead of a number.
 */
export const SCRUB = true as const;

export { gsap, ScrollTrigger };
