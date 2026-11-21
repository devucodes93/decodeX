import { useEffect, useState } from "react";
import { CalendarClock, Lock, Play, Unlock } from "lucide-react";
import * as api from "../api";
import type { EventState } from "../api";
import { Confirm, type Notify } from "./ui";

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
};

/** Start time, and close / reopen (sparc's "settings" row). */
export function EventTab({ event, now, notify }: { event: EventState; now: number; notify: Notify }) {
  const [start, setStart] = useState(() => toLocalInput(event.startsAt));
  const [message, setMessage] = useState(event.closedMessage);
  const [confirm, setConfirm] = useState<"close" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setStart(toLocalInput(event.startsAt)), [event.startsAt]);

  const run = async (key: string, patch: Partial<EventState>, note: string) => {
    setBusy(key);
    try {
      await api.updateEvent(patch);
      notify(note);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Couldn't save.", "error");
    } finally {
      setBusy(null);
    }
  };

  const live = api.isLive(event, now);

  return (
    <div className="ctf-control">
      <article className="ctf-card">
        <header>
          <CalendarClock size={18} aria-hidden="true" />
          <h2>Start time</h2>
          <span className={`ctf-pill is-${event.closed ? "ended" : live ? "live" : "standby"}`}>
            {event.closed ? "Ended" : live ? "Live" : "Standby"}
          </span>
        </header>
        <p className="ctf-muted">Missions unlock for every team at this time. Players see a countdown until then.</p>
        <label className="ctf-field">
          <span>Missions unlock at</span>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <div className="ctf-card-actions">
          <button
            type="button"
            className="ctf-btn ctf-btn--cream"
            disabled={!start || busy !== null}
            onClick={() => run("start", { startsAt: new Date(start).toISOString() }, "Start time saved.")}
          >
            {busy === "start" ? "Saving…" : "Save start time"}
          </button>
          <button
            type="button"
            className="ctf-btn ctf-btn--ghost"
            disabled={live || event.closed || busy !== null}
            onClick={() => run("now", { startsAt: new Date().toISOString() }, "Missions are open.")}
          >
            <Play size={15} aria-hidden="true" />
            <span>Open now</span>
          </button>
        </div>
      </article>

      <article className={`ctf-card${event.closed ? " is-ended" : ""}`}>
        <header>
          {event.closed ? <Lock size={18} aria-hidden="true" /> : <Unlock size={18} aria-hidden="true" />}
          <h2>{event.closed ? "Event is closed" : "Close the event"}</h2>
        </header>
        <p className="ctf-muted">
          Closing stops the event. No more flags are accepted, and players see your message with their final results.
        </p>
        <label className="ctf-field">
          <span>Message to players</span>
          <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <div className="ctf-card-actions">
          {event.closed ? (
            <>
              <button type="button" className="ctf-btn ctf-btn--cream" disabled={busy !== null} onClick={() => run("reopen", { closed: false }, "Event reopened.")}>
                {busy === "reopen" ? "Reopening…" : "Reopen event"}
              </button>
              <button
                type="button"
                className="ctf-btn ctf-btn--ghost"
                disabled={busy !== null || message === event.closedMessage}
                onClick={() => run("msg", { closedMessage: message }, "Message updated.")}
              >
                Update message
              </button>
            </>
          ) : (
            <button type="button" className="ctf-btn ctf-btn--danger" disabled={busy !== null} onClick={() => setConfirm("close")}>
              <Lock size={15} aria-hidden="true" />
              <span>Close event</span>
            </button>
          )}
        </div>
      </article>

      <Confirm
        open={confirm === "close"}
        title="Close the event for everyone?"
        body="Scoring stops right away. You can reopen it later."
        confirmLabel="Yes, close it"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await run("close", { closed: true, closedMessage: message }, "Event closed.");
          setConfirm(null);
        }}
      />
    </div>
  );
}
