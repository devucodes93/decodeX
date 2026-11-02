type Point = { x: number; y: number };

export default function JourneyCheckpoint({
  index,
  number,
  road,
  display,
  isMobile,
}: {
  index: number;
  number: string;
  road: Point;
  display: Point;
  isMobile: boolean;
}) {
  const halo = isMobile ? 18 : 24;
  const dash = isMobile ? 15.5 : 20.5;
  const pulse = isMobile ? 14 : 18;
  const ring = isMobile ? 12 : 16.5;
  const core = isMobile ? 8.8 : 12;
  const fontSize = isMobile ? 6.6 : 8.6;
  const originRadius = isMobile ? 2 : 2.6;

  return (
    <g
      className="journey-stop-anchor"
      data-journey-stop={index}
      aria-hidden="true"
    >
      <line
        className="journey-connector"
        x1={road.x.toFixed(2)}
        y1={road.y.toFixed(2)}
        x2={display.x.toFixed(2)}
        y2={display.y.toFixed(2)}
      />
      <circle
        className="journey-stop-origin"
        cx={road.x.toFixed(2)}
        cy={road.y.toFixed(2)}
        r={originRadius}
      />

      <g
        transform={`translate(${display.x.toFixed(2)} ${display.y.toFixed(2)})`}
      >
        <g className="journey-stop">
          <circle className="journey-stop-halo" r={halo} />
          <circle className="journey-stop-dash" r={dash} />
          <circle className="journey-stop-pulse" r={pulse} />
          <circle className="journey-stop-ring" r={ring} />
          <circle className="journey-stop-core" r={core} />
          <text
            className="journey-stop-number"
            textAnchor="middle"
            dy="0.35em"
            style={{ fontSize }}
          >
            {number}
          </text>
        </g>
      </g>
    </g>
  );
}
