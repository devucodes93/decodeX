import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EVENT } from "../../config/event";
import { ASSETS } from "../../config/assets";

const ease = [0.22, 1, 0.36, 1] as const;

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

export function IntroOverlay() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [titleReady, setTitleReady] = useState(false);
  const titleImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (titleImgRef.current?.complete && titleImgRef.current.naturalWidth > 0) {
      setTitleReady(true);
    }
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let cancelled = false;
    let finishTimer: number | undefined;
    let maxTimer: number | undefined;
    const started = performance.now();
    const minimum = reduce ? 450 : 1250;
    const maximum = reduce ? 1600 : 2800;
    const isHome = window.location.pathname === "/";

    const finish = () => {
      if (cancelled) return;
      window.clearTimeout(finishTimer);
      window.clearTimeout(maxTimer);
      setVisible(false);
    };

    maxTimer = window.setTimeout(finish, maximum);

    const criticalImages = isHome ? [ASSETS.title, ASSETS.gtaHero] : [ASSETS.title];
    Promise.all(criticalImages.map(preloadImage)).then(() => {
      if (cancelled) return;
      const remaining = Math.max(0, minimum - (performance.now() - started));
      finishTimer = window.setTimeout(finish, remaining);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(finishTimer);
      window.clearTimeout(maxTimer);
      document.body.style.overflow = previous;
    };
  }, [reduce]);

  useEffect(() => {
    if (visible) return;
    const timer = window.setTimeout(() => {
      document.body.style.overflow = "";
    }, reduce ? 100 : 900);
    return () => window.clearTimeout(timer);
  }, [visible, reduce]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="intro"
          role="presentation"
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: reduce ? 0.25 : 0.8, ease }}
        >
          <div className="intro-glow" aria-hidden="true" />

          <motion.div
            className="intro-mark"
            initial={reduce ? false : { opacity: 0, scale: 1.03, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease }}
          >
            <span
              className={`media-placeholder intro-mark-placeholder${titleReady ? " is-hidden" : ""}`}
              aria-hidden="true"
            />
            <img
              ref={titleImgRef}
              src={ASSETS.title}
              alt={EVENT.name}
              width={2245}
              height={922}
              draggable={false}
              onLoad={() => setTitleReady(true)}
            />
          </motion.div>

          <div className="intro-sub">
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease }}
            >
              {EVENT.tagline}
            </motion.span>
          </div>

          <motion.div
            className="intro-progress"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reduce ? 0.4 : 1.3, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
