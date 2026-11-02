import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../../animations/gsap";

interface CharacterImageProps {
  src: string;
  alt: string;
  className?: string;
  side?: "left" | "right";
  variant?: "about" | "faq";
}

export default function CharacterImage({
  src,
  alt,
  className,
  side = "right",
  variant = "about",
}: CharacterImageProps) {
  const ref = useRef<HTMLImageElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.set(el, {
            opacity: variant === "faq" ? 0.72 : 0.78,
            x: 0,
            y: 0,
            scale: 1,
          });
          return () => {};
        }
      );

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { opacity: variant === "faq" ? 0.72 : 0.78, x: 0, y: 0, scale: 1 });
      });

      return () => {
        mm.revert();
      };
    },
    { scope: ref }
  );

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={`character-image ${side} ${variant} ${className || ""}`}
      loading="eager"
      decoding="async"
      aria-hidden="true"
    />
  );
}
