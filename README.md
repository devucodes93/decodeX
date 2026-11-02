# College hackathon website

A single-page React website for a college hackathon: event information, tracks, schedule, prizes,
sponsors, FAQ and registration. Built with Vite, React, TypeScript, React Router and Framer Motion.
No backend, API keys or environment variables are required.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # TypeScript only
npm run build      # type-check, then build to dist/
npm run preview    # preview the production build
```

## Before launch: required event details

All event facts live in [`src/config/event.ts`](src/config/event.ts). Empty values are treated as
"not announced": the interface shows a clear "To be announced" label or hides optional content. Do
not invent dates, prizes, sponsors, winners or statistics.

| Field | Purpose | Example |
|---|---|---|
| `name` | Event name used across the site | `Abhikalp` |
| `edition` | Optional edition label | `2026 Edition` |
| `tagline` | One-line description | `Build solutions to real problems.` |
| `college`, `department`, `organizer` | Host institution and organizing body | `Coding Club, XYZ Institute of Technology` |
| `facultyCoordinator`, `studentCoordinators` | Organizing contacts shown on About | `Dr A. Sharma` |
| `date` | ISO date-time used by the countdown | `2026-03-14T09:00:00+05:30` |
| `dateLabel` | Human-readable date shown to visitors | `14–15 March 2026` |
| `registrationDeadline`, `venue`, `mode` | Logistics | `28 February 2026`, `Main Auditorium`, `Offline` |
| `teamSize`, `eligibility`, `fee` | Participation rules | `2–4 members`, `Open to all colleges`, `Free` |
| `prizePool` | Prize summary | `₹50,000` |
| `registrationUrl` | Official registration form. Leave empty to keep registration disabled | `https://...` |
| `contact.email`, `contact.phone`, `contact.person` | Public contact details | `hackathon@college.edu` |
| `social` | Instagram, LinkedIn, X and GitHub links | profile URLs |
| `privacyUrl`, `conductUrl` | Optional policy links in the footer | page URLs |
| `announcement` | Optional top banner text | `Registrations close on 28 February` |

Also replace the placeholder identity in [`index.html`](index.html) (`<title>` and social meta) with
the official event name.

## Content

| What | Where |
|---|---|
| Collaborating organizations and logos | `src/data/collaborators.ts` |
| Schedule stages | `src/data/timeline.ts` |
| Prizes and special awards | `src/data/prizes.ts` |
| Sponsors and partner tiers | `src/data/sponsors.ts` |
| FAQ | `src/data/faq.ts` |
| Previous edition (hidden until verified) | `src/data/previousEdition.ts` |
| Navigation | `src/config/navigation.ts` |
| Images and logos | `src/config/assets.ts` + `public/assets/` |
| Colors, type scale, spacing | `src/styles/global.css` |

Schedule stages are currently written as broad, **indicative** descriptions without invented dates
or times. Replace them with official information once confirmed.

Collaborator logos in `public/assets/collaborators/` are temporary placeholders. Replace them with
official organization logos using the same filenames, or update the paths in
`src/data/collaborators.ts`.

The previous-edition section is hidden while `PREVIOUS_EDITION.verified` is `false`. Add only
verified highlights and set it to `true` to display the section.

## Images

The photographs in `public/assets/photos/` are illustrative stock images from Pexels (free to use,
no attribution required). **Replace them with official event photographs before launch.** Keep the
same filenames to update the whole site, or edit the paths in `src/config/assets.ts`.

Recommended: landscape JPEG or WebP, roughly 1600–2000 px wide for the hero and 1200 px for section
images, compressed to keep the total page weight reasonable. Keep `logo.svg`, `college-logo.svg` and
`placeholder.svg` until official logos are available; sponsor logos can be added and referenced from
`src/data/sponsors.ts`.

## Registration

Registration is intentionally disabled while `registrationUrl` is empty. The registration page then
shows confirmed event facts, a "coming soon" notice and a clear statement that the site does not
collect personal data. Once the official form exists, set `registrationUrl` and the primary button
links to it. No application data is collected, stored or sent by this website.

## Publishing results

1. Fill `src/data/results.ts` with verified entries.
2. Set `SHOW_RESULTS = true` in `src/config/event.ts`.

While `SHOW_RESULTS` is `false`, the Results link is hidden from navigation, `/results` shows only
the announcement, and `src/data/results.ts` is never loaded. This is a static-site flag, not access
control: do not bundle confidential shortlists, and serve sensitive data from an authenticated
backend instead.

## Accessibility and behaviour

- Skip link, semantic headings, labelled navigation and visible focus styles.
- All animation respects `prefers-reduced-motion`.
- Photographs used as backgrounds are decorative (`alt=""`); content images have descriptive text.
- The mobile menu closes on navigation and locks page scroll while open.
- Unknown routes render a helpful 404 page.

## Deploy

Build command `npm run build`; output directory `dist`. The included `vercel.json` rewrites all paths
to the SPA. On Netlify, add a `_redirects` file containing:

```
/* /index.html 200
```

## Verification before publishing

- `npm run typecheck` and `npm run build` complete without errors.
- Check every route at desktop and mobile widths: `/`, `/about`, `/collaboration`, `/timeline`,
  `/sponsors`, `/faq`, `/register`, `/results`, and an unknown path.
- Confirm no placeholder copy or invented facts remain.
- Confirm `registrationUrl` is either a working official link or empty.
- Confirm images are official, compressed and correctly cropped.
- Confirm contact details, social links and policy links are correct.
