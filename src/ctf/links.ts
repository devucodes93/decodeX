// Mission links (usually Google Drive) shared by the admin editor, the API
// and the player page.

export type LinkKind = "drive-folder" | "drive-file" | "link";

export function linkInfo(url: string): { kind: LinkKind; host: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "drive.google.com" || host === "docs.google.com") {
      return { kind: /\/folders\//.test(u.pathname) ? "drive-folder" : "drive-file", host };
    }
    return { kind: "link", host };
  } catch {
    return { kind: "link", host: "" };
  }
}

/** Button text when the organiser leaves it empty. */
export function defaultLinkLabel(url: string): string {
  const { kind, host } = linkInfo(url);
  if (kind === "drive-folder") return "Mission files";
  if (kind === "drive-file") return "Mission file";
  return host ? `Open ${host}` : "Open link";
}

/** Small source note under the button, e.g. "Google Drive". */
export function linkSource(url: string): string {
  const { kind, host } = linkInfo(url);
  return kind === "link" ? host : "Google Drive";
}
