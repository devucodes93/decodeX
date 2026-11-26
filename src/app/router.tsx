import { createBrowserRouter, Navigate } from "react-router-dom";
import HomePage from "../pages/HomePage";
import AboutPage from "../pages/AboutPage";
import CollaborationPage from "../pages/CollaborationPage";
import TimelinePage from "../pages/TimelinePage";
import SponsorsPage from "../pages/SponsorsPage";
import FAQPage from "../pages/FAQPage";
import RegistrationPage from "../pages/RegistrationPage";
import ResultsPage from "../pages/ResultsPage";
import { SHOW_RESULTS } from "../config/event";
import PublicGate from "./PublicGate";
import { MaintenanceGate } from "./maintenance";
import type { ComponentType } from "react";
import NotFoundPage from "../pages/NotFoundPage";
import { CTF_PATHS } from "../ctf/config";

// Hidden CTF portal. Lives outside <App /> (no site header, footer or nav) and
// is never linked from the public site. Loaded on demand so none of it ships
// in the main bundle.
// Player pages also show the maintenance page while it's switched on. The
// control room and live leaderboard never do (organisers need them to turn
// it off again).
const gated = (Page: ComponentType) =>
  function GatedPlayerPage() {
    return (
      // `wait`: nothing shows until the check answers, so a mission can't
      // flash up before the maintenance page.
      <MaintenanceGate wait>
        <Page />
      </MaintenanceGate>
    );
  };

const ctfRoutes = [
  { path: CTF_PATHS.login, lazy: async () => ({ Component: gated((await import("../ctf/pages/LoginPage")).default) }) },
  { path: CTF_PATHS.lobby, lazy: async () => ({ Component: gated((await import("../ctf/pages/LobbyPage")).default) }) },
  { path: CTF_PATHS.play, lazy: async () => ({ Component: gated((await import("../ctf/pages/PlayPage")).default) }) },
  { path: CTF_PATHS.adminLogin, lazy: async () => ({ Component: (await import("../ctf/pages/AdminLoginPage")).default }) },
  { path: CTF_PATHS.admin, lazy: async () => ({ Component: (await import("../ctf/pages/AdminPage")).default }) },
  { path: CTF_PATHS.leaderboard, lazy: async () => ({ Component: (await import("../ctf/pages/LeaderboardPage")).default }) },
];

// PublicGate shows the maintenance page instead of the site when organisers
// switch it on (control room). Player CTF pages are gated above.
const publicRoutes = [{ path: "/", element: <PublicGate />, children: [
  { index: true, element: <HomePage /> }, { path: "about", element: <AboutPage /> },
  { path: "collaboration", element: <CollaborationPage /> },
  { path: "tracks", element: <Navigate to="/collaboration" replace /> },
  { path: "tracks/:slug", element: <Navigate to="/collaboration" replace /> },
  { path: "timeline", element: <TimelinePage /> }, { path: "sponsors", element: <SponsorsPage /> },
  { path: "faq", element: <FAQPage /> }, { path: "register", element: <RegistrationPage /> },
  ...(SHOW_RESULTS ? [{ path: "results", element: <ResultsPage /> }] : []),
  { path: "*", element: <NotFoundPage /> },
] }];

export const router = createBrowserRouter([...publicRoutes, ...ctfRoutes]);
