import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, X } from "lucide-react";

/** Centered dialog. Closes on Escape or a click outside. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  tone = "gold",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  tone?: "gold" | "red";
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the open effect (which would
  // steal focus back to the first field on every parent re-render).
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      ref.current?.querySelector<HTMLElement>("[autofocus], input, textarea, select, button")?.focus();
    }, 60);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ctf-modal-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={ref}
            className={`ctf-modal ctf-modal--form${wide ? " is-wide" : ""} is-${tone}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            <div className="ctf-modal-top">
              <h2 className="ctf-modal-h">{title}</h2>
              <button type="button" className="ctf-icon-btn" onClick={onClose} aria-label="Close">
                <X size={15} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** "Are you sure?" dialog, like sparc's delete confirmation. */
export function Confirm({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onCancel} title={title} tone="red">
      <div className="ctf-muted ctf-modal-text">{body}</div>
      <div className="ctf-modal-actions ctf-modal-actions--row">
        <button
          type="button"
          className={`ctf-btn ctf-btn--danger${busy ? " is-busy" : ""}`}
          disabled={busy}
          autoFocus
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
        <button type="button" className="ctf-btn ctf-btn--ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/** Small "copy to clipboard" button with a tick on success. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ctf-icon-btn"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}

/** One toast at a time at the bottom of the screen. */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "error"; id: number } | null>(null);
  const notify = useCallback((text: string, tone: "ok" | "error" = "ok") => setMsg({ text, tone, id: Date.now() }), []);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [msg]);

  const node = (
    <AnimatePresence>
      {msg && (
        <motion.p
          key={msg.id}
          className={`ctf-toast${msg.tone === "error" ? " is-error" : ""}`}
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
        >
          {msg.text}
        </motion.p>
      )}
    </AnimatePresence>
  );
  return { notify, toast: node };
}

export type Notify = (text: string, tone?: "ok" | "error") => void;

/** Downloads rows as a CSV file. */
export function downloadCsv(name: string, head: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [head.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${name}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
