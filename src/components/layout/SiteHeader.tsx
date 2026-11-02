import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV } from "../../config/navigation";
import { EVENT } from "../../config/event";
import { ASSETS } from "../../config/assets";
import { Img, PrimaryButton } from "../ui";

export function SiteHeader() {
  const [solid, setSolid] = useState(false), [open, setOpen] = useState(false);

  useEffect(() => { const f = () => setSolid(window.scrollY > 40); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <header className={`hdr ${solid || open ? "solid" : ""}`}>
      {EVENT.announcement && <div className="banner">{EVENT.announcement}</div>}
      <div className="hdr-in">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>        <Img src={ASSETS.logo} alt="" className="brand-logo" loading="eager" /><span>{EVENT.name}</span></Link>
        <nav className="dnav" aria-label="Main">
          {NAV.map((i) => <NavLink key={i.to} to={i.to} end={i.to === "/"} className={({ isActive }) => (isActive ? "on" : "")}>{({ isActive }) => <>{i.label}{isActive && <motion.i layoutId="pill" className="pill" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}</>}</NavLink>)}
        </nav>
        <div className="hdr-cta"><PrimaryButton to="/register">Register</PrimaryButton></div>
        <button className="burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav className="mnav" aria-label="Mobile" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            {NAV.map((i, n) => <motion.div key={i.to} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * n }}><NavLink to={i.to} end={i.to === "/"} onClick={() => setOpen(false)}>{i.label}</NavLink></motion.div>)}
            <div onClick={() => setOpen(false)}><PrimaryButton to="/register">Register</PrimaryButton></div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
