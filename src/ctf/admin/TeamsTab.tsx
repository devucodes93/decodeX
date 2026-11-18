import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Download, KeyRound, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import * as api from "../api";
import type { LeaderboardRow, SavedTeam, TeamInput, TeamRecord } from "../api";
import { Confirm, CopyButton, Modal, downloadCsv, type Notify } from "./ui";

const emptyTeam = (): TeamInput => ({
  name: "",
  institution: "",
  leader: "",
  email: "",
  phone: "",
  members: [],
  ieeeId: "",
  password: api.generatePassword(),
});

/**
 * Registered teams (sparc's applications list) plus their CTF logins.
 * No payment details are collected or stored. Passwords are stored as hashes
 * on the server, so a password is shown only once: when it is set.
 */
export function TeamsTab({
  teams,
  board,
  notify,
  onRefresh,
  refreshing,
}: {
  teams: TeamRecord[] | null;
  board: LeaderboardRow[];
  notify: Notify;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<TeamInput | null>(null);
  const [creds, setCreds] = useState<{ team: SavedTeam; title: string } | null>(null);
  const [deleting, setDeleting] = useState<TeamRecord | null>(null);
  const [resetting, setResetting] = useState<TeamRecord | null>(null);
  const [rekeying, setRekeying] = useState<TeamRecord | null>(null);

  const attempt = async (work: () => Promise<void>) => {
    try {
      await work();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Something went wrong.", "error");
    }
  };

  const stats = useMemo(() => new Map(board.map((r) => [r.teamId, r])), [board]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = teams ?? [];
    if (!term) return list;
    return list.filter((t) =>
      [t.name, t.id, t.institution, t.leader, t.email, t.phone, ...t.members].some((v) => v.toLowerCase().includes(term)),
    );
  }, [teams, q]);

  const exportCsv = () =>
    downloadCsv(
      "decodex-ctf-teams",
      ["Team ID", "Team", "College", "Leader", "Email", "Contact", "Members", "IEEE ID", "Registered"],
      (teams ?? []).map((t) => [
        t.id,
        t.name,
        t.institution,
        t.leader,
        t.email,
        t.phone,
        t.members.join("; "),
        t.ieeeId,
        new Date(t.createdAt).toISOString(),
      ]),
    );

  return (
    <>
      <div className="ctf-toolbar">
        <label className="ctf-search">
          <Search size={16} aria-hidden="true" />
          <span className="ctf-sr">Search teams</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, email, member…" />
        </label>
        <span className="ctf-count">
          <b>{teams?.length ?? "–"}</b> registered
        </span>
        <button type="button" className={`ctf-btn ctf-btn--ghost${refreshing ? " is-spinning" : ""}`} onClick={onRefresh}>
          <RefreshCw size={16} aria-hidden="true" />
          <span>Refresh</span>
        </button>
        <button type="button" className="ctf-btn ctf-btn--ghost" onClick={exportCsv} disabled={!teams?.length}>
          <Download size={16} aria-hidden="true" />
          <span>Export</span>
        </button>
        <button type="button" className="ctf-btn ctf-btn--gold" onClick={() => setEditing(emptyTeam())}>
          <Plus size={16} aria-hidden="true" />
          <span>Add team</span>
        </button>
      </div>

      {!teams && <p className="ctf-muted">Loading teams…</p>}
      {teams && shown.length === 0 && (
        <p className="ctf-empty-box">{teams.length ? `No teams match “${q}”.` : "No teams yet. Add the first one."}</p>
      )}

      <ul className="ctf-team-list">
        {shown.map((t, i) => (
          <TeamCard
            key={t.id}
            team={t}
            index={i}
            stat={stats.get(t.id)}
            onEdit={() => setEditing({ ...t })}
            onNewPassword={() => setRekeying(t)}
            onReset={() => setResetting(t)}
            onDelete={() => setDeleting(t)}
          />
        ))}
      </ul>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.name || "team"}` : "Add a team"} wide>
        {editing && (
          <TeamForm
            key={editing.id ?? "new"}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSaved={(team, isNew) => {
              setEditing(null);
              if (isNew) setCreds({ team, title: "Team created" });
              else notify(`${team.name} updated.`);
            }}
          />
        )}
      </Modal>

      <Modal open={Boolean(creds)} onClose={() => setCreds(null)} title={creds?.title ?? ""}>
        {creds && (
          <>
            <p className="ctf-muted ctf-modal-text">
              Send these login details to <b className="ctf-cream">{creds.team.email}</b>. The password is shown only now, so
              copy it before closing.
            </p>
            <dl className="ctf-creds">
              <div>
                <dt>Login email</dt>
                <dd>
                  <code>{creds.team.email}</code>
                  <CopyButton text={creds.team.email} label="Copy login email" />
                </dd>
              </div>
              <div>
                <dt>Password</dt>
                <dd>
                  <code>{creds.team.password}</code>
                  <CopyButton text={creds.team.password ?? ""} label="Copy password" />
                </dd>
              </div>
            </dl>
            <div className="ctf-modal-actions">
              <CopyAll team={creds.team} />
              <button type="button" className="ctf-btn ctf-btn--ghost" onClick={() => setCreds(null)}>
                Done
              </button>
            </div>
          </>
        )}
      </Modal>

      <Confirm
        open={Boolean(deleting)}
        title="Delete this team?"
        body={
          <>
            <b className="ctf-cream">{deleting?.name}</b> ({deleting?.id}) will lose its login, its progress and any hints sent only to it.
            This can't be undone.
          </>
        }
        confirmLabel="Yes, delete"
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          attempt(async () => {
            if (!deleting) return;
            await api.deleteTeam(deleting.id);
            notify(`${deleting.name} deleted.`);
            setDeleting(null);
          })
        }
      />

      <Confirm
        open={Boolean(resetting)}
        title="Reset this team's progress?"
        body={
          <>
            Clears every flag and the clock for <b className="ctf-cream">{resetting?.name}</b>. They start again from mission 01.
          </>
        }
        confirmLabel="Reset progress"
        onCancel={() => setResetting(null)}
        onConfirm={() =>
          attempt(async () => {
            if (!resetting) return;
            await api.resetTeamProgress(resetting.id);
            notify(`${resetting.name} reset.`);
            setResetting(null);
          })
        }
      />

      <Confirm
        open={Boolean(rekeying)}
        title="Give this team a new password?"
        body={
          <>
            <b className="ctf-cream">{rekeying?.name}</b>'s current password stops working and any signed-in device is signed out.
            Their progress is kept.
          </>
        }
        confirmLabel="Set new password"
        onCancel={() => setRekeying(null)}
        onConfirm={() =>
          attempt(async () => {
            if (!rekeying) return;
            const team = await api.saveTeam({ ...rekeying, password: api.generatePassword() });
            setRekeying(null);
            setCreds({ team, title: "New password set" });
          })
        }
      />
    </>
  );
}

function CopyAll({ team }: { team: SavedTeam }) {
  const [done, setDone] = useState(false);
  const text = `DECODEX CTF login\nTeam: ${team.name}\nEmail: ${team.email}\nPassword: ${team.password}`;
  return (
    <button
      type="button"
      className="ctf-btn ctf-btn--gold"
      autoFocus
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? "Copied" : "Copy login details"}
    </button>
  );
}

function TeamCard({
  team: t,
  index,
  stat,
  onEdit,
  onNewPassword,
  onReset,
  onDelete,
}: {
  team: TeamRecord;
  index: number;
  stat?: LeaderboardRow;
  onEdit: () => void;
  onNewPassword: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const rows: [string, string][] = [
    ["Leader", t.leader],
    ["Members", t.members.join(", ")],
    ["Email", t.email],
    ["Contact", t.phone],
    ["College", t.institution],
    ["IEEE ID", t.ieeeId],
  ];

  return (
    <motion.li
      className="ctf-team-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03 }}
    >
      <header className="ctf-team-card-head">
        <div>
          <h3>{t.name}</h3>
          <div className="ctf-team-tags">
            <span className="ctf-tag">{t.id}</span>
            {t.ieeeId && <span className="ctf-tag ctf-tag--dark">IEEE</span>}
            {stat && (
              <span className="ctf-tag ctf-tag--dark">
                {stat.solved}/{stat.total} flags · {stat.score} pts
              </span>
            )}
          </div>
        </div>
        <small className="ctf-muted">Added {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small>
      </header>

      <dl className="ctf-team-details">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v || "—"}</dd>
          </div>
        ))}
      </dl>

      <footer className="ctf-team-card-actions">
        <button type="button" className="ctf-btn ctf-btn--ghost" onClick={onEdit}>
          <Pencil size={14} aria-hidden="true" /> Edit
        </button>
        <button type="button" className="ctf-btn ctf-btn--ghost" onClick={onNewPassword}>
          <KeyRound size={14} aria-hidden="true" /> New password
        </button>
        <button type="button" className="ctf-btn ctf-btn--ghost" onClick={onReset} disabled={!stat?.solved}>
          <RotateCcw size={14} aria-hidden="true" /> Reset progress
        </button>
        <button type="button" className="ctf-btn ctf-btn--ghost is-danger" onClick={onDelete}>
          <Trash2 size={14} aria-hidden="true" /> Delete
        </button>
      </footer>
    </motion.li>
  );
}

function TeamForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: TeamInput;
  onCancel: () => void;
  onSaved: (team: SavedTeam, isNew: boolean) => void;
}) {
  const [v, setV] = useState<TeamInput>(initial);
  const [membersText, setMembersText] = useState(initial.members.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof TeamInput>(k: K, val: TeamInput[K]) => setV((p) => ({ ...p, [k]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const team = await api.saveTeam({
        ...v,
        password: initial.id ? undefined : v.password,
        members: membersText.split(/\n|,/),
      });
      onSaved(team, !initial.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the team.");
      setBusy(false);
    }
  };

  const text = (k: "name" | "institution" | "leader" | "email" | "phone" | "ieeeId", label: string, opts: { type?: string; placeholder?: string; required?: boolean } = {}) => (
    <label className="ctf-field">
      <span>
        {label}
        {opts.required && " *"}
      </span>
      <input type={opts.type ?? "text"} value={v[k]} placeholder={opts.placeholder} onChange={(e) => set(k, e.target.value)} />
    </label>
  );

  return (
    <form className="ctf-form" onSubmit={submit} noValidate>
      <div className="ctf-form-grid">
        {text("name", "Team name", { required: true })}
        {text("institution", "College")}
        {text("leader", "Team leader")}
        {text("email", "Team lead email (used to sign in)", { type: "email", required: true })}
        {text("phone", "Contact number", { type: "tel" })}
        {text("ieeeId", "IEEE ID", { placeholder: "If any" })}
        <label className="ctf-field ctf-form-span">
          <span>Members (one per line)</span>
          <textarea rows={3} value={membersText} onChange={(e) => setMembersText(e.target.value)} />
        </label>
        {!initial.id && (
          <label className="ctf-field ctf-form-span">
            <span>Login password (shown once after saving)</span>
            <span className="ctf-inline">
              <input className="ctf-mono" value={v.password ?? ""} onChange={(e) => set("password", e.target.value)} />
              <button type="button" className="ctf-btn ctf-btn--ghost" onClick={() => set("password", api.generatePassword())}>
                <RefreshCw size={14} aria-hidden="true" /> New
              </button>
            </span>
          </label>
        )}
      </div>

      {error && (
        <p className="ctf-alert" role="alert">
          <span>{error}</span>
        </p>
      )}

      <div className="ctf-modal-actions ctf-modal-actions--row">
        <button type="submit" className={`ctf-btn ctf-btn--gold${busy ? " is-busy" : ""}`} disabled={busy}>
          {busy ? "Saving…" : initial.id ? "Save changes" : "Create team"}
        </button>
        <button type="button" className="ctf-btn ctf-btn--ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
