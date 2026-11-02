type CitySkylineProps = {
  className?: string;
};

/**
 * Decorative city plate drawn from simple geometry so the site never depends
 * on licensed game art for its skyline.
 */
export default function CitySkyline({ className = "" }: CitySkylineProps) {
  return (
    <svg
      className={`city-skyline${className ? ` ${className}` : ""}`}
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g className="skyline-far">
        <rect x="0" y="184" width="74" height="136" />
        <rect x="74" y="142" width="58" height="178" />
        <rect x="132" y="208" width="92" height="112" />
        <rect x="224" y="124" width="48" height="196" />
        <rect x="272" y="174" width="86" height="146" />
        <rect x="358" y="98" width="62" height="222" />
        <rect x="420" y="156" width="94" height="164" />
        <rect x="514" y="188" width="58" height="132" />
        <rect x="572" y="132" width="106" height="188" />
        <rect x="678" y="84" width="54" height="236" />
        <rect x="732" y="166" width="88" height="154" />
        <rect x="820" y="116" width="62" height="204" />
        <rect x="882" y="194" width="96" height="126" />
        <rect x="978" y="146" width="54" height="174" />
        <rect x="1032" y="104" width="82" height="216" />
        <rect x="1114" y="178" width="66" height="142" />
        <rect x="1180" y="134" width="96" height="186" />
        <rect x="1276" y="196" width="62" height="124" />
        <rect x="1338" y="154" width="102" height="166" />
      </g>

      <g className="skyline-near">
        <rect x="0" y="246" width="118" height="74" />
        <rect x="118" y="222" width="74" height="98" />
        <rect x="192" y="258" width="128" height="62" />
        <rect x="320" y="212" width="70" height="108" />
        <rect x="390" y="242" width="106" height="78" />
        <rect x="496" y="204" width="62" height="116" />
        <rect x="558" y="254" width="118" height="66" />
        <rect x="676" y="222" width="78" height="98" />
        <rect x="754" y="262" width="124" height="58" />
        <rect x="878" y="232" width="72" height="88" />
        <rect x="950" y="206" width="64" height="114" />
        <rect x="1014" y="250" width="104" height="70" />
        <rect x="1118" y="226" width="74" height="94" />
        <rect x="1192" y="258" width="128" height="62" />
        <rect x="1320" y="216" width="70" height="104" />
        <rect x="1390" y="244" width="50" height="76" />
      </g>

      <g className="skyline-windows">
        <rect x="90" y="158" width="6" height="8" />
        <rect x="106" y="158" width="6" height="8" />
        <rect x="90" y="176" width="6" height="8" />
        <rect x="106" y="176" width="6" height="8" />
        <rect x="240" y="142" width="6" height="7" />
        <rect x="254" y="142" width="6" height="7" />
        <rect x="240" y="158" width="6" height="7" />
        <rect x="254" y="158" width="6" height="7" />
        <rect x="374" y="118" width="6" height="7" />
        <rect x="390" y="118" width="6" height="7" />
        <rect x="374" y="134" width="6" height="7" />
        <rect x="390" y="134" width="6" height="7" />
        <rect x="590" y="150" width="7" height="8" />
        <rect x="608" y="150" width="7" height="8" />
        <rect x="628" y="150" width="7" height="8" />
        <rect x="590" y="170" width="7" height="8" />
        <rect x="608" y="170" width="7" height="8" />
        <rect x="628" y="170" width="7" height="8" />
        <rect x="694" y="104" width="6" height="8" />
        <rect x="710" y="104" width="6" height="8" />
        <rect x="694" y="122" width="6" height="8" />
        <rect x="710" y="122" width="6" height="8" />
        <rect x="1050" y="124" width="7" height="8" />
        <rect x="1068" y="124" width="7" height="8" />
        <rect x="1086" y="124" width="7" height="8" />
        <rect x="1050" y="142" width="7" height="8" />
        <rect x="1068" y="142" width="7" height="8" />
        <rect x="1086" y="142" width="7" height="8" />
        <rect x="1200" y="154" width="7" height="8" />
        <rect x="1218" y="154" width="7" height="8" />
        <rect x="1236" y="154" width="7" height="8" />
        <rect x="1200" y="174" width="7" height="8" />
        <rect x="1218" y="174" width="7" height="8" />
        <rect x="1236" y="174" width="7" height="8" />
        <rect x="1356" y="174" width="7" height="8" />
        <rect x="1374" y="174" width="7" height="8" />
        <rect x="1392" y="174" width="7" height="8" />
      </g>

      <g className="skyline-palm skyline-palm--left" transform="translate(168 320) scale(1.05)">
        <path d="M0 0V-88" />
        <path d="M0-86c-16-10-30-8-42 4M0-86c14-12 30-12 44-2M0-86c-10-16-8-30 4-42M0-86c12-10 18-24 14-40" />
      </g>
      <g className="skyline-palm skyline-palm--right" transform="translate(1258 320) scale(1.18)">
        <path d="M0 0V-104" />
        <path d="M0-102c-18-10-34-8-46 4M0-102c16-14 34-12 48 0M0-102c-10-18-8-34 4-46M0-102c12-12 18-26 14-42" />
      </g>

      <g className="skyline-lamp" transform="translate(760 320)">
        <path d="M0 0V-72M0-72h26" />
        <circle cx="26" cy="-72" r="3.4" />
      </g>
    </svg>
  );
}
