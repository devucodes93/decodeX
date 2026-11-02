type HazardTapeProps = {
  className?: string;
  label?: string;
};

export default function AboutHazardTape({
  className = "",
  label = "RESTRICTED AREA",
}: HazardTapeProps) {
  return (
    <div className={`about-hazard-tape ${className}`}>
      <span>{label}</span>
    </div>
  );
}
