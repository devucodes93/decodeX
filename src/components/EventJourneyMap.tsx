import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";
import { TIMELINE } from "../data/timeline";
import JourneyCheckpoint from "./JourneyCheckpoint";
import JourneyEventCard from "./JourneyEventCard";
import JourneyWalker from "./visuals/JourneyWalker";
import RallyCar from "./RallyCar";
import "./EventJourneyMap.css";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, useGSAP);

type Point = { x: number; y: number };
type DecorationType =
  | "tree"
  | "flag"
  | "sign"
  | "hill"
  | "beacon"
  | "rocks"
  | "building"
  | "distance";

const EVENTS = TIMELINE.map((event, index) => ({
  ...event,
  number: String(index + 1).padStart(2, "0"),
}));

const MOBILE_BREAKPOINT = 940;
const DESKTOP_ROW_HEIGHT = 330;
const MOBILE_ROW_HEIGHT = 300;
const DESKTOP_BOTTOM_PAD = 150;
const MOBILE_BOTTOM_PAD = 110;
const MAX_MAP_WIDTH = 1120;

const ROAD_OFFSETS = [
  -0.34, 0.58, -0.72, 0.22, 0.84, -0.5, 0.66, -0.86, 0.3, 0,
];

function smoothPath(points: Point[]) {
  if (points.length < 2) return "";

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;

    const controlOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const controlTwo = {
      x: next.x - (after.x - current.x) / 6,
      y: next.y - (after.y - current.y) / 6,
    };

    path += ` C ${controlOne.x.toFixed(2)} ${controlOne.y.toFixed(2)}, ${controlTwo.x.toFixed(2)} ${controlTwo.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }

  return path;
}

function MapDecoration({
  type,
  x,
  y,
  scale,
}: {
  type: DecorationType;
  x: number;
  y: number;
  scale: number;
}) {
  return (
    <g
      className={`journey-decor journey-decor--${type}`}
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale})`}
      aria-hidden="true"
    >
      {type === "tree" && (
        <>
          <path className="decor-muted" d="M0 0v-17" />
          <path className="decor-line" d="M-9-7 0-23 9-7H-9ZM-7-15 0-29 7-15H-7Z" />
          <circle className="decor-warm" cx="0" cy="-28" r="1.6" />
        </>
      )}
      {type === "flag" && (
        <>
          <path className="decor-muted" d="M0 0v-25" />
          <path className="decor-line" d="M0-25c7-4 12 4 19 0v11c-7 4-12-4-19 0v-11Z" />
          <circle className="decor-warm" cx="19" cy="-20" r="1.7" />
        </>
      )}
      {type === "sign" && (
        <>
          <path className="decor-muted" d="M0 0v-22" />
          <path className="decor-line" d="M-11-22h18l5 5-5 5h-18v-10Z" />
          <path className="decor-warm" d="M-6-17h9M3-19l2 2-2 2" />
        </>
      )}
      {type === "hill" && (
        <>
          <path className="decor-line" d="M-20 0c3-12 11-17 19-12 7-10 16-5 18 4 1 5-2 8-7 8H-20Z" />
          <path className="decor-muted" d="M-13-3h7M-2-6h9M11-3h4" />
          <circle className="decor-warm" cx="9" cy="-14" r="1.8" />
        </>
      )}
      {type === "beacon" && (
        <>
          <path className="decor-muted" d="M0 0v-20" />
          <path className="decor-line" d="M-8-20h16M-4-25a4 4 0 0 1 8 0" />
          <path className="decor-warm" d="M0-31v-4M-9-29l-3-3M9-29l3-3" />
          <circle className="decor-line" cx="0" cy="-25" r="2.5" />
        </>
      )}
      {type === "rocks" && (
        <>
          <path className="decor-line" d="m-12 0 5-9 7 3 5-6 8 12H-12Z" />
          <path className="decor-muted" d="m-1-6 3-3 3 4" />
        </>
      )}
      {type === "building" && (
        <>
          <path className="decor-line" d="M-14 0v-18h28v18M-17-18 0-28l17 10H-17Z" />
          <path className="decor-window" d="M-7-11h5v11h-5zM3-11h5v5H3z" />
          <path className="decor-warm" d="M0-28v-5" />
          <circle className="decor-warm" cx="0" cy="-34" r="1.4" />
        </>
      )}
      {type === "distance" && (
        <>
          <path className="decor-muted" d="M0 0v-20" />
          <path className="decor-line" d="M-12-20h19l5 5-5 5h-19v-10Z" />
          <path className="decor-warm" d="M-7-16h8M2-18l2 2-2 2" />
        </>
      )}
    </g>
  );
}

function StartLandmark({ x, y }: { x: number; y: number }) {
  return (
    <g
      className="journey-landmark journey-landmark--start"
      transform={`translate(${x} ${y})`}
      aria-hidden="true"
    >
      <path className="landmark-muted" d="M0 22V-8" />
      <path className="landmark-line" d="M0-8c8-4 13 4 21 0v11c-8 4-13 4-21 0V-8Z" />
      <text className="landmark-label" x="3" y="22">
        START
      </text>
    </g>
  );
}

function FinishLandmark({ x, y }: { x: number; y: number }) {
  return (
    <g
      className="journey-landmark journey-landmark--finish"
      transform={`translate(${x} ${y})`}
      aria-hidden="true"
    >
      <g className="finish-flag">
        <rect x="0" y="-26" width="7" height="7" />
        <rect x="14" y="-26" width="7" height="7" />
        <rect x="7" y="-19" width="7" height="7" />
        <rect x="21" y="-19" width="7" height="7" />
        <rect x="0" y="-12" width="7" height="7" />
        <rect x="14" y="-12" width="7" height="7" />
      </g>
      <text className="landmark-label" x="3" y="20">
        FINISH
      </text>
    </g>
  );
}

export default function EventJourneyMap() {
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const roadRef = useRef<SVGPathElement>(null);
  const activeRoadGlowRef = useRef<SVGPathElement>(null);
  const activeRoadRef = useRef<SVGPathElement>(null);
  const vehicleRef = useRef<SVGGElement>(null);
  const [mapWidth, setMapWidth] = useState(() =>
    typeof window === "undefined"
      ? MAX_MAP_WIDTH
      : Math.min(MAX_MAP_WIDTH, Math.max(280, window.innerWidth - 48))
  );

  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width);
      setMapWidth((current) =>
        Math.abs(current - nextWidth) > 1 ? nextWidth : current
      );
    });

    observer.observe(map);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => {
    const isMobile = mapWidth < MOBILE_BREAKPOINT;
    const rowHeight = isMobile ? MOBILE_ROW_HEIGHT : DESKTOP_ROW_HEIGHT;
    const bottomPad = isMobile ? MOBILE_BOTTOM_PAD : DESKTOP_BOTTOM_PAD;
    const height = EVENTS.length * rowHeight + bottomPad;
    const center = isMobile ? 58 : mapWidth / 2;
    const corridor = isMobile
      ? 0
      : Math.min(246, Math.max(200, mapWidth * 0.22));
    const offsetScale = isMobile ? 10 : corridor * 0.42;
    const markerOffset = isMobile ? 44 : 62;

    const markers = EVENTS.map((_, index) => {
      const road = {
        x: center + ROAD_OFFSETS[index] * offsetScale,
        y: rowHeight * (index + 0.5),
      };
      const side: -1 | 1 = isMobile || index % 2 === 0 ? -1 : 1;
      const display = {
        x: road.x + side * markerOffset,
        y: road.y,
      };

      return { road, display, side };
    });

    const start = { x: center, y: 26 };
    const end = { x: center, y: height - 26 };
    const path = smoothPath([start, ...markers.map((marker) => marker.road), end]);

    const decorationSlots: Array<{
      gap: number;
      side: -1 | 1;
      type: DecorationType;
      scale: number;
    }> = isMobile
      ? [
          { gap: 2, side: -1, type: "tree", scale: 0.5 },
          { gap: 5, side: -1, type: "rocks", scale: 0.52 },
          { gap: 7, side: -1, type: "flag", scale: 0.46 },
        ]
      : [
          { gap: 1, side: -1, type: "tree", scale: 0.95 },
          { gap: 2, side: 1, type: "sign", scale: 0.9 },
          { gap: 3, side: -1, type: "hill", scale: 0.85 },
          { gap: 4, side: 1, type: "tree", scale: 1.08 },
          { gap: 5, side: -1, type: "beacon", scale: 0.86 },
          { gap: 6, side: 1, type: "building", scale: 0.92 },
          { gap: 7, side: -1, type: "rocks", scale: 0.9 },
          { gap: 8, side: 1, type: "distance", scale: 0.9 },
          { gap: 9, side: -1, type: "flag", scale: 0.9 },
        ];

    const decorations = decorationSlots.map((slot, index) => ({
      ...slot,
      x: isMobile ? 22 : center + slot.side * corridor * 0.42,
      y: rowHeight * (slot.gap + 1) + (index % 2 === 0 ? 12 : -10),
    }));

    return {
      isMobile,
      rowHeight,
      height,
      center,
      corridor,
      markers,
      start,
      end,
      path,
      decorations,
    };
  }, [mapWidth]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const map = mapRef.current;
      const road = roadRef.current;
      const activeRoadGlow = activeRoadGlowRef.current;
      const activeRoad = activeRoadRef.current;
      const vehicle = vehicleRef.current;

      if (!section || !map || !road || !activeRoadGlow || !activeRoad || !vehicle) return;

      const cards = Array.from(
        section.querySelectorAll<HTMLElement>(".journey-card")
      );
      const rows = Array.from(
        section.querySelectorAll<HTMLElement>(".journey-row")
      );
      const stops = Array.from(
        section.querySelectorAll<SVGGElement>(".journey-stop-anchor")
      );
      const media = gsap.matchMedia();
      let mounted = true;

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const length = road.getTotalLength();

        const walker = vehicle.querySelector<SVGElement>(".journey-walker");
        let walkTimer: number | undefined;

        const markWalking = () => {
          if (!walker) return;
          walker.classList.add("is-walking");
          window.clearTimeout(walkTimer);
          walkTimer = window.setTimeout(() => walker.classList.remove("is-walking"), 170);
        };

        gsap.set([activeRoad, activeRoadGlow], {
          strokeDasharray: length,
          strokeDashoffset: length,
        });
        gsap.set(vehicle, {
          autoAlpha: 1,
          motionPath: {
            path: road,
            align: road,
            alignOrigin: [0.5, 1],
            autoRotate: false,
            start: 0,
            end: 0,
          },
        });

        const routeTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: map,
            start: "top 64%",
            end: "bottom 70%",
            scrub: 0.85,
            invalidateOnRefresh: true,
          },
        });

        routeTimeline.eventCallback("onUpdate", markWalking);

        routeTimeline
          .to(
            [activeRoad, activeRoadGlow],
            {
              strokeDashoffset: 0,
              ease: "none",
              duration: 1,
            },
            0
          )
          .to(
            vehicle,
            {
              motionPath: {
                path: road,
                align: road,
                alignOrigin: [0.5, 1],
                autoRotate: false,
                start: 0,
                end: 1,
              },
              ease: "none",
              duration: 1,
              onUpdate: markWalking,
            },
            0
          );

        const heading = section.querySelector(".journey-heading");
        if (heading) {
          gsap.from(heading.children, {
            autoAlpha: 0,
            y: 24,
            duration: 0.8,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: heading,
              start: "top 88%",
              once: true,
            },
          });
        }

        cards.forEach((card, index) => {
          const row = rows[index];
          const stop = stops[index];

          const cardTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          });

          cardTimeline.fromTo(
            card,
            { autoAlpha: 0, y: 30 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.75,
              ease: "power3.out",
            }
          );

          if (row) {
            ScrollTrigger.create({
              trigger: row,
              start: "top 74%",
              end: "bottom 26%",
              toggleClass: {
                targets: stop ? [card, stop] : card,
                className: "is-active",
              },
            });
          }
        });

        return () => {
          window.clearTimeout(walkTimer);
          walker?.classList.remove("is-walking");
          routeTimeline.kill();
        };
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([activeRoad, activeRoadGlow], {
          strokeDasharray: "none",
          strokeDashoffset: 0,
        });
        gsap.set(vehicle, { autoAlpha: 0 });
        gsap.set(cards, { autoAlpha: 1, y: 0 });
      });

      document.fonts?.ready.then(() => {
        if (mounted) ScrollTrigger.refresh();
      });

      return () => {
        mounted = false;
        media.revert();
      };
    },
    {
      scope: sectionRef,
      dependencies: [mapWidth, layout.isMobile],
      revertOnUpdate: true,
    }
  );

  const mapStyle = {
    height: layout.height,
    "--journey-corridor": `${layout.isMobile ? 88 : layout.corridor}px`,
  } as CSSProperties;

  return (
    <section
      ref={sectionRef}
      className="journey-section"
      aria-labelledby="journey-title"
    >
      <div className="journey-atmosphere" aria-hidden="true" />

      <header className="journey-heading journey-wrap">
        <p className="journey-eyebrow">The event roadmap</p>
        <h1 id="journey-title">
          Every great idea
          <br />
          starts with a <span>journey.</span>
        </h1>
        <p className="journey-subtitle">
          Follow the road. Discover every stage of DecodeX.
        </p>
      </header>

      <div className="journey-map-wrap">
        <h2 className="journey-sr-only">Event destinations</h2>
        <div
          ref={mapRef}
          className={`journey-map${layout.isMobile ? " is-mobile" : ""}`}
          style={mapStyle}
        >
          <svg
            className="journey-road-svg"
            viewBox={`0 0 ${mapWidth} ${layout.height}`}
            width={mapWidth}
            height={layout.height}
            preserveAspectRatio="xMidYMin meet"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="journey-asphalt"
                width="18"
                height="18"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="3" cy="4" r="0.7" fill="#8a907f" opacity="0.22" />
                <circle cx="12" cy="9" r="0.55" fill="#8a907f" opacity="0.16" />
                <circle cx="7" cy="15" r="0.45" fill="#8a907f" opacity="0.14" />
                <circle cx="15" cy="2" r="0.4" fill="#8a907f" opacity="0.12" />
              </pattern>
            </defs>

            <g className="journey-decorations">
              {layout.decorations.map((decoration, index) => (
                <MapDecoration
                  key={`${decoration.type}-${index}`}
                  type={decoration.type}
                  x={decoration.x}
                  y={decoration.y}
                  scale={decoration.scale}
                />
              ))}
            </g>

            <path
              d={layout.path}
              className="journey-road-shadow"
              fill="none"
              transform="translate(0 6)"
            />
            <path
              ref={roadRef}
              d={layout.path}
              className="journey-road-edge"
              fill="none"
            />
            <path d={layout.path} className="journey-road-base" fill="none" />
            <path d={layout.path} className="journey-road-texture" fill="none" stroke="url(#journey-asphalt)" />
            <path d={layout.path} className="journey-road-glow" fill="none" />
            <path
              ref={activeRoadGlowRef}
              d={layout.path}
              className="journey-road-active-glow"
              fill="none"
              strokeDasharray="1 99999"
              strokeDashoffset="1"
            />
            <path
              ref={activeRoadRef}
              d={layout.path}
              className="journey-road-active"
              fill="none"
              strokeDasharray="1 99999"
              strokeDashoffset="1"
            />
            <path d={layout.path} className="journey-road-centre" fill="none" />

            <g className="journey-checkpoints">
              {layout.markers.map((marker, index) => (
                <JourneyCheckpoint
                  key={EVENTS[index].number}
                  index={index}
                  number={EVENTS[index].number}
                  road={marker.road}
                  display={marker.display}
                  isMobile={layout.isMobile}
                />
              ))}
            </g>

            <StartLandmark
              x={layout.start.x + (layout.isMobile ? 26 : 42)}
              y={layout.start.y + 2}
            />
            <FinishLandmark
              x={layout.end.x + (layout.isMobile ? 26 : 42)}
              y={layout.end.y - 2}
            />

            <g
              className="journey-parked-car"
              transform={`translate(${layout.start.x - (layout.isMobile ? 34 : 48)} ${layout.start.y + 42}) rotate(180) scale(0.82)`}
              aria-hidden="true"
            >
              <RallyCar />
            </g>

            <g ref={vehicleRef} className="journey-vehicle-position">
              <JourneyWalker />
            </g>
          </svg>

          <div className="journey-rows">
            {EVENTS.map((event, index) => {
              const isLeft = index % 2 === 0;

              return (
                <div
                  key={event.number}
                  className={`journey-row ${
                    isLeft ? "journey-row--left" : "journey-row--right"
                  }`}
                  style={{ height: layout.rowHeight }}
                  data-journey-row={index}
                >
                  <JourneyEventCard
                    event={event}
                    index={index}
                    total={EVENTS.length}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="journey-finish journey-wrap">
        <span className="journey-finish-kicker">End of the road</span>
        <h2>See you at the challenge.</h2>
        <p>
          The schedule is confirmed. Any updates will be shared through official
          channels.
        </p>
      </footer>
    </section>
  );
}
