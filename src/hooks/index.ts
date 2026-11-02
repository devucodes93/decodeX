import { useEffect, useState } from "react";
export function useTitle(title: string) { useEffect(() => { document.title = title; }, [title]); }
export function useCountdown(iso: string) {
  const target = iso ? new Date(iso).getTime() : NaN;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (isNaN(target)) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [target]);
  const ms = target - now;
  if (isNaN(target) || ms <= 0) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return [["days", String(Math.floor(ms / 864e5))], ["hours", p(Math.floor(ms / 36e5) % 24)], ["mins", p(Math.floor(ms / 6e4) % 60)], ["secs", p(Math.floor(ms / 1e3) % 60)]] as [string, string][];
}
