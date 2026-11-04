import { useEffect, useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import { SiteHeader } from "../components/layout/SiteHeader";
import { SiteFooter } from "../components/layout/SiteFooter";
import { IntroOverlay } from "../components/layout/IntroOverlay";

import { BackToTop } from "../components/ui";
import { ScrollTrigger } from "../animations/gsap";

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
        document.querySelector(hash)?.scrollIntoView(),
      );
      return () => window.cancelAnimationFrame(frame);
    }

    const scrollTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollTop();
    const frame = window.requestAnimationFrame(() => {
      scrollTop();
      ScrollTrigger.refresh();
    });

    return () => window.cancelAnimationFrame(frame);
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
