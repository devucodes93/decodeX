import { Navigate, useNavigate } from "react-router-dom";
import { Lock, Radio, Trophy } from "lucide-react";
import { CtfShell } from "../components/CtfShell";
import { AccessPanel } from "../components/AccessPanel";
import { CTF_PATHS } from "../config";
import { useAdminSession } from "../hooks";
import * as api from "../api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const admin = useAdminSession();
  if (admin && admin !== "checking") return <Navigate to={CTF_PATHS.admin} replace />;

  return (
    <CtfShell art="/assets/eligibility/lobby-panel.jpg" artPosition="center 30%" title="Admin login" className="ctf--admin">
      <main className="ctf-gate">
        <section className="ctf-gate-intro">
          <p className="ctf-kicker ctf-kicker--pink">Restricted // Organisers only</p>
          <h2 className="ctf-display">
            The control room.
            <br />
            <em>Eyes on every crew.</em>
          </h2>
          <p className="ctf-gate-lede">
            Sign in to see the live leaderboard, manage teams and missions, send hints, and open or close the event.
          </p>
          <ul className="ctf-gate-facts">
            <li>
              <Trophy size={18} aria-hidden="true" />
              <span>
                <b>Leaderboard</b>
                Visible to organisers only
              </span>
            </li>
            <li>
              <Radio size={18} aria-hidden="true" />
              <span>
                <b>Live</b>
                Updates as teams capture flags
              </span>
            </li>
            <li>
              <Lock size={18} aria-hidden="true" />
              <span>
                <b>Event control</b>
                Start time, close and reopen
              </span>
            </li>
          </ul>
        </section>

        <AccessPanel
          title="Admin Login"
          banner="/assets/eligibility/header_eligibility.jpg"
          bannerPosition="center 30%"
          subbar={["Control room", "Level 5 clearance"]}
          fields={[
            { name: "email", label: "Email", type: "email", placeholder: "Organiser email", autoComplete: "username" },
            { name: "password", label: "Password", type: "password", placeholder: "Password", autoComplete: "current-password" },
          ]}
          submitLabel="Open control room"
          busyLabel="Checking clearance…"
          onSubmit={async (v) => {
            await api.adminLogin(v.email, v.password);
            navigate(CTF_PATHS.admin, { replace: true });
          }}
          footnote="Organisers only. Don't share this link."
        />
      </main>
    </CtfShell>
  );
}
