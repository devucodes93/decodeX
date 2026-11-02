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

export const router = createBrowserRouter([{ path: "/", element: <App />, children: [
  { index: true, element: <HomePage /> }, { path: "about", element: <AboutPage /> },
  { path: "collaboration", element: <CollaborationPage /> },
  { path: "tracks", element: <Navigate to="/collaboration" replace /> },
  { path: "tracks/:slug", element: <Navigate to="/collaboration" replace /> },
  { path: "timeline", element: <TimelinePage /> }, { path: "sponsors", element: <SponsorsPage /> },
  { path: "faq", element: <FAQPage /> }, { path: "register", element: <RegistrationPage /> },
  ...(SHOW_RESULTS ? [{ path: "results", element: <ResultsPage /> }] : []),
  { path: "*", element: <NotFoundPage /> },
] }]);
