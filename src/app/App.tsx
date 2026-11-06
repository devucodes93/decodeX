import { useEffect, useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import { SiteHeader } from "../components/layout/SiteHeader";
import { SiteFooter } from "../components/layout/SiteFooter";
import { IntroOverlay } from "../components/layout/IntroOverlay";

import { BackToTop } from "../components/ui";
import { ScrollTrigger } from "../animations/gsap";

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

/**
 * Recalculate every ScrollTrigger and jump scrubbed animations straight to
 * their correct state. On a page change the new page's triggers are created
 * while the window is still scrolled from the previous page; without this,
 * smoothed (scrub) animations — e.g. the Home hero background parallax/zoom —
 * start from that stale position and visibly slide, landing off on some
 * machines.
 */
function settleScrollTriggers() {
  ScrollTrigger.refresh();
  ScrollTrigger.getAll().forEach((st) => {
    // Only scroll-scrubbed animations: snap them to the trigger's real
    // progress (skipping the smoothing lag). One-shot / toggle animations
    // (entrances) are left alone.
    if (!st.vars.scrub || !st.animation) return;
    st.update();
    // Finish the smoothing (scrub) tween instantly so the animation lands on
    // the trigger's real progress. Do NOT kill it: ScrollTrigger keeps reusing
    // that tween, and a killed tween can never render again - which froze
    // every scrubbed animation (e.g. Timeline cards stayed invisible).
    st.getTween()?.progress(1);
    st.animation.progress(st.progress);
  });
}

export default function App() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    if (hash) {
      const frame = window.requestAnimationFrame(() =>
        document.querySelector(hash)?.scrollIntoView({ behavior: "instant" }),
      );
      return () => window.cancelAnimationFrame(frame);
    }

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.documentElement.scrollLeft = 0;
      document.body.scrollTop = 0;
      document.body.scrollLeft = 0;
    };

    // ScrollTrigger remembers scroll positions and restores them after a
    // refresh. A page change alters the page height, which on laptops with a
    // visible scrollbar resizes the window and triggers an automatic refresh
    // ~200ms later — restoring the OLD page's scroll position, so the new page
    // opened already scrolled. Clear that memory on every navigation.
    ScrollTrigger.clearScrollMemory("manual");
    resetScroll();
    settleScrollTriggers();

    // For a short window after navigating, keep the new page at the top if
    // anything (a late refresh, images settling) moves it — unless the user
    // has started scrolling themselves.
    let userScrolled = false;
    const markUser = () => {
      userScrolled = true;
    };
    const keepTop = () => {
      if (!userScrolled && (window.scrollY || document.documentElement.scrollTop) !== 0) {
        resetScroll();
      }
    };
    const userEvents: (keyof WindowEventMap)[] = ["wheel", "touchstart", "keydown", "pointerdown"];
    userEvents.forEach((ev) => window.addEventListener(ev, markUser, { passive: true }));
    ScrollTrigger.addEventListener("refresh", keepTop);

    const raf = window.requestAnimationFrame(() => {
      keepTop();
      settleScrollTriggers();
    });
    const timers = [50, 300, 700].map((ms) =>
      window.setTimeout(() => {
        ScrollTrigger.clearScrollMemory("manual");
        keepTop();
        if (!userScrolled) settleScrollTriggers();
      }, ms),
    );
    const stopGuard = window.setTimeout(() => {
      ScrollTrigger.removeEventListener("refresh", keepTop);
      userEvents.forEach((ev) => window.removeEventListener(ev, markUser));
    }, 1200);

    return () => {
      window.cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(stopGuard);
      ScrollTrigger.removeEventListener("refresh", keepTop);
      userEvents.forEach((ev) => window.removeEventListener(ev, markUser));
    };
  }, [pathname, hash]);
  return (
    <MotionConfig reducedMotion="user">
      <IntroOverlay />
      <a href="#main" className="skip">Skip to content</a>
      <SiteHeader />
      <motion.main id="main" key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}><Outlet /></motion.main>
      <SiteFooter /><BackToTop />
    </MotionConfig>
  );
}
