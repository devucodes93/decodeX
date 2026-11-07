import { useMemo, useState } from "react";
import { Plus, Minus, ExternalLink } from "lucide-react";
import "./MiniMapst.css"
export type EventLocation = {
  name: string;
  lat: number;
  lng: number;
  zoom?: number; // 13 to 16
  query?: string; // what Google Maps opens on click
};

type Props = { location: EventLocation; floating?: boolean };

const TILE = 256;
const MIN_Z = 13;
const MAX_Z = 16; // Esri dark canvas ends at 16

const tileUrl = (z: number, x: number, y: number) => {
  const n = 2 ** z;
  const xx = ((x % n) + n) % n;
  return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${xx}`;
};

const project = (lat: number, lng: number, z: number) => {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
};

// SVG arc (0deg = right, 90deg = down, clockwise)
const arc = (r: number, a1: number, a2: number) => {
  const p = (a: number) => {
    const t = (a * Math.PI) / 180;
    return `${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`;
  };
  return `M ${p(a1)} A ${r} ${r} 0 0 1 ${p(a2)}`;
};

export function MiniMap({ location, floating = false }: Props) {
  const { name, lat, lng } = location;
  const [zoom, setZoom] = useState(
    Math.min(MAX_Z, Math.max(MIN_Z, location.zoom ?? 16))
  );

  const tiles = useMemo(() => {
    const { x, y } = project(lat, lng, zoom);
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const out: { key: string; src: string; left: number; top: number }[] = [];
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const cy = ty + dy;
        if (cy < 0 || cy >= 2 ** zoom) continue;
        out.push({
          key: `${zoom}-${tx + dx}-${cy}`,
          src: tileUrl(zoom, tx + dx, cy),
          left: (dx - (x - tx)) * TILE,
          top: (dy - (y - ty)) * TILE,
        });
      }
    }
    return out;
  }, [lat, lng, zoom]);

  const openUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location.query ?? `${lat},${lng}`
  )}`;

  return (
    <div className={`gta4 ${floating ? "gta4--fixed" : ""}`}>
      <div className="gta4-radar">
        <div className="gta4-tiles">
          {tiles.map((t) => (
            <img
              key={t.key}
              src={t.src}
              alt=""
              draggable={false}
              className="gta4-tile"
              style={{ left: t.left, top: t.top }}
            />
          ))}
        </div>
        <div className="gta4-tint" />
        <div className="gta4-vignette" />
        <span className="gta4-north">N</span>

        <span className="gta4-pulse" />
        <svg className="gta4-arrow" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M12 2 L20 21 L12 16.5 L4 21 Z"
            fill="#fff"
            stroke="#000"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>

        <span className="gta4-hint">
          <ExternalLink size={11} />
        </span>

        {/* the whole radar is the link */}
        <a
          className="gta4-link"
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${name} in Google Maps`}
          title={name}
        />
      </div>

      {/* health (green) + armour (blue) arcs, bottom-left like the game */}
      <svg className="gta4-ring" viewBox="0 0 100 100" aria-hidden="true">
        <path className="gta4-track" d={arc(43, 105, 185)} />
        <path className="gta4-fill gta4-fill--health" d={arc(43, 105, 185)} />
        <path className="gta4-track" d={arc(46.5, 110, 180)} />
        <path className="gta4-fill gta4-fill--armor" d={arc(46.5, 110, 165)} />
      </svg>

      <div className="gta4-controls">
        <button
          type="button"
          className="gta4-btn"
          onClick={() => setZoom((z) => Math.min(MAX_Z, z + 1))}
          aria-label="Zoom in"
        >
          <Plus size={12} />
        </button>
        <button
          type="button"
          className="gta4-btn"
          onClick={() => setZoom((z) => Math.max(MIN_Z, z - 1))}
          aria-label="Zoom out"
        >
          <Minus size={12} />
        </button>
      </div>

      <span className="gta4-credit">Esri · © OpenStreetMap contributors</span>
    </div>
  );
}