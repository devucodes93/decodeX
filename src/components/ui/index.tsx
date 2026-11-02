import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../../animations/gsap";
import { ASSETS } from "../../config/assets";

interface BtnProps { to?: string; href?: string; disabled?: boolean; children: ReactNode; variant?: "primary" | "secondary" }
function Btn({ to, href, disabled, variant = "primary", children }: BtnProps) {
  const cls = `btn ${variant}`;
  if (disabled || (!to && !href)) return <span className={`${cls} off`} aria-disabled="true">{children}</span>;
  if (to) return <Link className={cls} to={to}>{children}</Link>;
  return <a className={cls} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}
export const PrimaryButton = (p: BtnProps) => <Btn {...p} />;
export const SecondaryButton = (p: BtnProps) => <Btn {...p} variant="secondary" />;

export const ScrollReveal = ({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 34 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-70px" }} transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
);
export function AnimatedAmount({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;

    const match = value.match(/\d[\d,]*/);
    if (!match) {
      el.textContent = value;
      return;
    }

    const target = Number(match[0].replace(/,/g, ""));
    if (!Number.isFinite(target)) {
      el.textContent = value;
      return;
    }

    const start = match.index ?? 0;
    const prefix = value.slice(0, start);
    const suffix = value.slice(start + match[0].length);
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const state = { n: 0 };
      const tween = gsap.to(state, {
        n: target,
        duration: 1.55,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => {
          el.textContent = `${prefix}${Math.round(state.n).toLocaleString("en-IN")}${suffix}`;
        },
        onComplete: () => {
          el.textContent = value;
        },
      });
      return () => tween.kill();
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      el.textContent = value;
    });

    return () => {
      mm.revert();
      el.textContent = value;
    };
  }, { scope: ref, dependencies: [value] });

  return <span ref={ref} className={className} aria-label={value}>{value}</span>;
}

export const SectionHeading = ({ title, intro, kicker }: { title: string; intro?: string; kicker?: string }) => (
  <ScrollReveal className="sh">
    {kicker && <p className="kicker">{kicker}</p>}
    <h2>{title}</h2>
    {intro && <p>{intro}</p>}
  </ScrollReveal>
);
export function Img({
  src,
  alt,
  className,
  loading = "lazy",
}: {
  src?: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [s, setS] = useState(src || ASSETS.placeholder);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setS(src || ASSETS.placeholder);
    setLoaded(false);
  }, [src]);

  return (
    <img
      className={`media-img ${loaded ? "is-loaded" : "is-loading"}${className ? ` ${className}` : ""}`}
      src={s}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => {
        setS(ASSETS.placeholder);
        setLoaded(true);
      }}
    />
  );
}
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => { const f = () => setShow(window.scrollY > 700); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  return <AnimatePresence>{show && <motion.button className="totop" aria-label="Back to top" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} onClick={() => window.scrollTo({ top: 0 })}><ArrowUp size={20} /></motion.button>}</AnimatePresence>;
}
