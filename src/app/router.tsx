import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import HomePage from "../pages/HomePage";
import AboutPage from "../pages/AboutPage";
import CollaborationPage from "../pages/CollaborationPage";
import TimelinePage from "../pages/TimelinePage";
import SponsorsPage from "../pages/SponsorsPage";
import FAQPage from "../pages/FAQPage";
import RegistrationPage from "../pages/RegistrationPage";
import ResultsPage from "../pages/ResultsPage";
import { SHOW_RESULTS } from "../config/event";
import NotFoundPage from "../pages/NotFoundPage";
import { CTF_PATHS } from "../ctf/config";

// Hidden CTF portal. Lives outside <App /> (no site header, footer or nav) and
// is never linked from the public site. Loaded on demand so none of it ships
// in the main bundle.
const ctfRoutes = [
  { path: CTF_PATHS.login, lazy: async () => ({ Component: (await import("../ctf/pages/LoginPage")).default }) },
  { path: CTF_PATHS.lobby, lazy: async () => ({ Component: (await import("../ctf/pages/LobbyPage")).default }) },
  { path: CTF_PATHS.play, lazy: async () => ({ Component: (await import("../ctf/pages/PlayPage")).default }) },
  { path: CTF_PATHS.adminLogin, lazy: async () => ({ Component: (await import("../ctf/pages/AdminLoginPage")).default }) },
  { path: CTF_PATHS.admin, lazy: async () => ({ Component: (await import("../ctf/pages/AdminPage")).default }) },
];

export const router = createBrowserRouter([{ path: "/", element: <App />, children: [
  { index: true, element: <HomePage /> }, { path: "about", element: <AboutPage /> },
  { path: "collaboration", element: <CollaborationPage /> },
  { path: "tracks", element: <Navigate to="/collaboration" replace /> },
  { path: "tracks/:slug", element: <Navigate to="/collaboration" replace /> },
  { path: "timeline", element: <TimelinePage /> }, { path: "sponsors", element: <SponsorsPage /> },
  { path: "faq", element: <FAQPage /> }, { path: "register", element: <RegistrationPage /> },
  ...(SHOW_RESULTS ? [{ path: "results", element: <ResultsPage /> }] : []),
  { path: "*", element: <NotFoundPage /> },
] }, ...ctfRoutes]);
