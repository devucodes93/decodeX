// Hidden CTF portal configuration.
//
// These routes are intentionally NOT linked from anywhere on the public site
// (no nav, footer, or buttons). Share the URLs directly with participants and
// organisers. To move the portal, change the paths here only.

export const CTF_PATHS = {
  login: "/ctf/login",
  lobby: "/ctf",
  play: "/ctf/play",
  adminLogin: "/ctf-admin/login",
  admin: "/ctf-admin",
} as const;

/** Flag format shown to players. */
export const FLAG_FORMAT = "DECODEX{...}";
