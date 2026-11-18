import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Flag, KeyRound, ListOrdered, Mail, Timer } from "lucide-react";
import { ASSETS } from "../../config/assets";
import { EVENT } from "../../config/event";
import { CtfShell } from "../components/CtfShell";
import { AccessPanel } from "../components/AccessPanel";
import { CTF_PATHS, FLAG_FORMAT } from "../config";
import * as api from "../api";

export default function LoginPage() {
  const navigate = useNavigate();
  const expired = Boolean((useLocation().state as { expired?: boolean } | null)?.expired);
  if (api.getSession()) return <Navigate to={CTF_PATHS.lobby} replace />;

  return (
    <CtfShell art={ASSETS.gtaCity} artPosition="30% 40%" title="Mission login" className="ctf--player">
      <main className="ctf-gate">
        <section className="ctf-gate-intro">
          <p className="ctf-kicker">DECODEX {EVENT.edition} // Virtual CTF</p>
          <h2 className="ctf-display">
            Enter the mission.
            <br />
            <em>Decode the unknown.</em>
          </h2>
          <p className="ctf-gate-lede">
            Sign in with your team lead's email and the password sent to it to reach the briefing room.
          </p>
          <ul className="ctf-gate-facts">
            <li>
              <Timer size={18} aria-hidden="true" />
              <span>
                <b>Qualifier</b>
                {EVENT.qualifierDate} · {EVENT.qualifierTime}
              </span>
            </li>
            <li>
              <ListOrdered size={18} aria-hidden="true" />
              <span>
                <b>Format</b>
                Missions unlock one at a time
              </span>
            </li>
            <li>
              <Flag size={18} aria-hidden="true" />
              <span>
                <b>Flag format</b>
                <code>{FLAG_FORMAT}</code>
              </span>
            </li>
          </ul>
        </section>

        <AccessPanel
          title="Mission Login"
          banner="/assets/eligibility/lobby-banner.jpg"
          subbar={["Team access", "Secure line"]}
          fields={[
            {
              name: "email",
              label: "Team lead email",
              type: "email",
              placeholder: "lead@college.edu",
              autoComplete: "username",
              icon: <Mail size={18} />,
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              placeholder: "Team password",
              autoComplete: "current-password",
              icon: <KeyRound size={18} />,
            },
          ]}
          submitLabel="Enter the mission"
          busyLabel="Verifying crew…"
          onSubmit={async (v) => {
            await api.login(v.email, v.password);
            navigate(CTF_PATHS.lobby, { replace: true });
          }}
          footnote="Your password was emailed to the team lead. One device per team: signing in here signs out any other device."
          notice={expired ? "Your team signed in on another device, so this session ended. Sign in again to continue here." : undefined}
        />
      </main>
    </CtfShell>
  );
}
