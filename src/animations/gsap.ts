import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Mobile browsers resize the viewport when the address bar shows/hides while
// scrolling. Without this, every ScrollTrigger recalculates mid-scroll, which
// shows up as jumps/flicker on phones.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };
