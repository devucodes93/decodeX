import { useEffect, useRef, useState, type FormEvent } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, GripVertical, Lock, MessageSquareText, Paperclip, Pencil, Plus, Trash2, X } from "lucide-react";
import * as api from "../api";
import type { MissionInput, MissionStat } from "../api";
import { FLAG_FORMAT } from "../config";
import { Confirm, Modal, type Notify } from "./ui";

const emptyMission = (): MissionInput => ({
  title: "",
  category: "",
  points: 100,
  prompt: "",
  flag: "",
  attachments: [],
});

export function MissionsTab({
  stats,
  teams,
  notify,
  onHint,
}: {
  stats: MissionStat[] | null;
  teams: number;
  notify: Notify;
  /** Jump to the hints tab with this mission selected. */
  onHint: (missionId: string) => void;
}) {
  const [order, setOrder] = useState<MissionStat[]>([]);
  const dragging = useRef(false);
  const [editing, setEditing] = useState<MissionInput | null>(null);
  const [deleting, setDeleting] = useState<MissionStat | null>(null);

  // Follow live data, except mid-drag.
  useEffect(() => {
    if (stats && !dragging.current) setOrder(stats);
  }, [stats]);

  const persist = async (next: MissionStat[]) => {
    const before = stats?.map((m) => m.id).join();
    const after = next.map((m) => m.id).join();
    if (before === after) return;
    try {
      await api.reorderMissions(next.map((m) => m.id));
      notify("Mission order saved.");
    } catch (e) {
      if (stats) setOrder(stats);
      notify(e instanceof Error ? e.message : "Couldn't save the order.", "error");
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    void persist(next);
  };

  if (!stats) return <p className="ctf-muted">Loading missions…</p>;

  const totalPoints = order.reduce((s, m) => s + m.points, 0);

  return (
    <>
      <div className="ctf-toolbar">
        <span className="ctf-count">
          <b>{order.length}</b> missions · <b>{totalPoints.toLocaleString("en-IN")}</b> points
        </span>
        <span className="ctf-muted ctf-toolbar-note">Drag to reorder. Teams always get the first mission they haven't solved.</span>
        <button type="button" className="ctf-btn ctf-btn--gold" onClick={() => setEditing(emptyMission())}>
          <Plus size={16} aria-hidden="true" />
          <span>Add mission</span>
        </button>
      </div>

      {order.length === 0 ? (
        <p className="ctf-empty-box">No missions yet. Add the first one.</p>
      ) : (
        <Reorder.Group as="ol" axis="y" values={order} onReorder={setOrder} className="ctf-mission-list">
          {order.map((m, i) => (
            <MissionRow
              key={m.id}
              mission={m}
              index={i}
              count={order.length}
              teams={teams}
              onDragStart={() => (dragging.current = true)}
              onDragEnd={() => {
                dragging.current = false;
                void persist(order);
              }}
              onMove={(dir) => move(i, dir)}
              onEdit={() => {
                const { solves: _s, order: _o, ...rest } = m;
                // Flags are never sent back; an empty field keeps the current one.
                setEditing({ ...structuredClone(rest), flag: "" });
              }}
              onDelete={() => setDeleting(m)}
              onHint={() => onHint(m.id)}
            />
          ))}
        </Reorder.Group>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? "Edit mission" : "Add a mission"} wide>
        {editing && (
          <MissionForm
            key={editing.id ?? "new"}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSaved={(title, isNew) => {
              setEditing(null);
              notify(isNew ? `“${title}” added at the end.` : `“${title}” saved.`);
            }}
          />
        )}
      </Modal>

      <Confirm
        open={Boolean(deleting)}
        title="Delete this mission?"
        body={
          <>
            <b className="ctf-cream">{deleting?.title}</b> will disappear for every team.
            {deleting?.solves ? ` ${deleting.solves} team${deleting.solves === 1 ? "" : "s"} solved it; those points will be removed.` : ""}{" "}
            Hints for it are deleted too.
          </>
        }
        confirmLabel="Yes, delete"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.deleteMission(deleting.id);
            notify(`“${deleting.title}” deleted.`);
            setDeleting(null);
          } catch (e) {
            notify(e instanceof Error ? e.message : "Couldn't delete the mission.", "error");
          }
        }}
      />
    </>
  );
}

function MissionRow({
  mission: m,
  index,
  count,
  teams,
  onDragStart,
  onDragEnd,
  onMove,
  onEdit,
  onDelete,
  onHint,
}: {
  mission: MissionStat;
  index: number;
  count: number;
  teams: number;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
  onHint: () => void;
}) {
  const controls = useDragControls();
  const rate = teams ? m.solves / teams : 0;

  return (
    <Reorder.Item
      value={m}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="ctf-mission-row"
      whileDrag={{ scale: 1.01, boxShadow: "0 24px 50px -20px rgba(0,0,0,0.9)" }}
    >
      <button
        type="button"
        className="ctf-grip"
        onPointerDown={(e) => {
          e.preventDefault();
          controls.start(e);
        }}
        aria-label={`Drag to reorder ${m.title}`}
        tabIndex={-1}
      >
        <GripVertical size={18} />
      </button>
      <span className="ctf-mission-num">{String(index + 1).padStart(2, "0")}</span>

      <div className="ctf-mission-info">
        <b>{m.title}</b>
        <span className="ctf-mission-sub">
          <span>{m.category}</span>
          <span className="ctf-points-sm">{m.points} pts</span>
          {m.attachments.length > 0 && (
            <span>
              <Paperclip size={12} aria-hidden="true" /> {m.attachments.length}
            </span>
          )}
        </span>
      </div>

      <div className="ctf-mission-solves">
        <span className="ctf-meter">
          <span className="ctf-meter-bar">
            <i style={{ width: `${rate * 100}%` }} />
          </span>
          <span className="ctf-mono">
            {m.solves} <small className="ctf-muted">solves</small>
          </span>
        </span>
        <span className="ctf-flag-sealed" title="Flags are stored as hashes and can't be shown. Edit the mission to replace it.">
          <Lock size={13} aria-hidden="true" /> Flag sealed
        </span>
      </div>

      <div className="ctf-mission-actions">
        <button type="button" className="ctf-icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${m.title} up`}>
          <ArrowUp size={15} />
        </button>
        <button type="button" className="ctf-icon-btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${m.title} down`}>
          <ArrowDown size={15} />
        </button>
        <button type="button" className="ctf-icon-btn" onClick={onHint} aria-label={`Send a hint for ${m.title}`} title="Send a hint">
          <MessageSquareText size={15} />
        </button>
        <button type="button" className="ctf-icon-btn" onClick={onEdit} aria-label={`Edit ${m.title}`} title="Edit">
          <Pencil size={15} />
        </button>
        <button type="button" className="ctf-icon-btn is-danger" onClick={onDelete} aria-label={`Delete ${m.title}`} title="Delete">
          <Trash2 size={15} />
        </button>
      </div>
    </Reorder.Item>
  );
}

function MissionForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: MissionInput;
  onCancel: () => void;
  onSaved: (title: string, isNew: boolean) => void;
}) {
  const [v, setV] = useState<MissionInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof MissionInput>(k: K, val: MissionInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const setFile = (i: number, k: "label" | "size" | "url", val: string) =>
    set(
      "attachments",
      v.attachments.map((a, j) => (j === i ? { ...a, [k]: val } : a)),
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveMission(v);
      onSaved(saved.title, !initial.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the mission.");
      setBusy(false);
    }
  };

  return (
    <form className="ctf-form" onSubmit={submit} noValidate>
      <div className="ctf-form-grid ctf-form-grid--3">
        <label className="ctf-field ctf-form-span-2">
          <span>Title *</span>
          <input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Static on Channel 7" />
        </label>
        <label className="ctf-field">
          <span>Points *</span>
          <input type="number" min={0} step={10} value={Number.isFinite(v.points) ? v.points : ""} onChange={(e) => set("points", e.target.valueAsNumber)} />
        </label>
        <label className="ctf-field">
          <span>Category</span>
          <input value={v.category} onChange={(e) => set("category", e.target.value)} placeholder="Audio, Filters…" />
        </label>
        <label className="ctf-field ctf-form-span-2">
          <span>{initial.id ? "New flag (leave empty to keep the current one)" : `Flag * (format ${FLAG_FORMAT})`}</span>
          <input
            className="ctf-mono"
            type="password"
            autoComplete="new-password"
            value={v.flag}
            onChange={(e) => set("flag", e.target.value)}
            spellCheck={false}
            placeholder={initial.id ? "••••••••  (unchanged)" : FLAG_FORMAT}
          />
          <small className="ctf-muted">Saved as a one-way hash. Nobody can view it later, so keep your own answer key.</small>
        </label>
        <label className="ctf-field ctf-form-span-3">
          <span>Mission brief (what players read)</span>
          <textarea rows={5} value={v.prompt} onChange={(e) => set("prompt", e.target.value)} />
        </label>
      </div>

      <div className="ctf-attach-edit">
        <span className="ctf-field-label">Files for players</span>
        {v.attachments.length === 0 && <p className="ctf-muted ctf-small">No files. Add download links for audio, data or images.</p>}
        {v.attachments.map((a, i) => (
          <div className="ctf-attach-row" key={i}>
            <input aria-label="File name" placeholder="File name" value={a.label} onChange={(e) => setFile(i, "label", e.target.value)} />
            <input aria-label="Download link" placeholder="https:// download link" value={a.url ?? ""} onChange={(e) => setFile(i, "url", e.target.value)} />
            <input aria-label="Size" placeholder="Size" value={a.size ?? ""} onChange={(e) => setFile(i, "size", e.target.value)} />
            <button
              type="button"
              className="ctf-icon-btn"
              aria-label="Remove file"
              onClick={() =>
                set(
                  "attachments",
                  v.attachments.filter((_, j) => j !== i),
                )
              }
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <button type="button" className="ctf-link-btn" onClick={() => set("attachments", [...v.attachments, { label: "", url: "", size: "" }])}>
          + Add file
        </button>
      </div>

      {error && (
        <p className="ctf-alert" role="alert">
          <span>{error}</span>
        </p>
      )}

      <div className="ctf-modal-actions ctf-modal-actions--row">
        <button type="submit" className={`ctf-btn ctf-btn--gold${busy ? " is-busy" : ""}`} disabled={busy}>
          {busy ? "Saving…" : initial.id ? "Save mission" : "Add mission"}
        </button>
        <button type="button" className="ctf-btn ctf-btn--ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
