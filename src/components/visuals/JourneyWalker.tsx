type JourneyWalkerProps = {
  className?: string;
};

/**
 * Original silhouette traveller used on the timeline and in the hero.
 * The character is deliberately generic (no third-party character art).
 */
export default function JourneyWalker({ className = "" }: JourneyWalkerProps) {
  return (
    <svg
      className={`journey-walker${className ? ` ${className}` : ""}`}
      viewBox="0 0 64 118"
      width={34}
      height={62}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse className="walker-shadow" cx="32" cy="113" rx="17" ry="3.2" />

      <g className="walker-body">
        <g className="walker-leg walker-leg--back">
          <path className="walker-leg-fill" d="M30 76 28 98l-4 14" />
          <path className="walker-shoe" d="M24 111h12" />
        </g>

        <g className="walker-leg walker-leg--front">
          <path className="walker-leg-fill" d="M35 76 37 98l4 14" />
          <path className="walker-shoe" d="M41 111h12" />
        </g>

        <path
          className="walker-coat"
          d="M22 43c0-8 4-13 11-13s11 5 11 13v27c0 6-4 10-11 10s-11-4-11-10V43Z"
        />
        <path className="walker-coat-detail" d="M30 42v25M36 42v25" />

        <path className="walker-arm walker-arm--back" d="M22 48c-5 3-7 8-5 14" />
        <path className="walker-arm walker-arm--front" d="M42 48c5 3 7 8 5 14" />

        <rect className="walker-pack" x="11" y="46" width="9" height="19" rx="3" />
        <path className="walker-pack-strap" d="M21 48h6" />

        <circle className="walker-head" cx="33" cy="25" r="10" />
        <path
          className="walker-hair"
          d="M23 24c0-8 5-13 11-13 7 0 11 5 11 12-4-3-8-4-12-3-3 1-6 2-10 4Z"
        />
        <path className="walker-scarf" d="M25 39h17l-2 5H27l-2-5Z" />
      </g>
    </svg>
  );
}
