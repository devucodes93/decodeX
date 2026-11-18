import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { TitleArt } from "../../components/ui/TitleArt";

export type AccessField = {
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  /** Optional icon shown inside the input. */
  icon?: ReactNode;
  placeholder: string;
  autoComplete: string;
};

type Props = {
  /** Pricedown title (must exist in src/data/titleArt.json). */
  title: string;
  banner: string;
  bannerPosition?: string;
  /** Left / right text in the black sub-bar. */
  subbar: [string, string];
  fields: AccessField[];
  submitLabel: string;
  busyLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  footnote: ReactNode;
  /** Information shown above the form (e.g. "you were signed out"). */
  notice?: ReactNode;
};

/** Login card styled like the site's in-game job lobby menu. */
export function AccessPanel(p: Props) {
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(p.fields.map((f) => [f.name, ""])),
  );
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controls = useAnimationControls();

  useEffect(() => {
    void controls.start({ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } });
  }, [controls]);

  const shake = () => void controls.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const missing = p.fields.find((f) => !values[f.name].trim());
    if (missing) {
      setError(`Enter your ${missing.label.toLowerCase()}.`);
      shake();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await p.onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access denied.");
      shake();
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="ctf-access"
      initial={{ opacity: 0, y: 24 }}
      animate={controls}
    >
      <div className="ctf-access-banner">
        <img src={p.banner} alt="" style={{ objectPosition: p.bannerPosition ?? "center 35%" }} />
        <h1 className="ctf-access-title">
          <TitleArt text={p.title} />
        </h1>
      </div>
      <div className="ctf-subbar">
        <span>{p.subbar[0]}</span>
        <span>{p.subbar[1]}</span>
      </div>

      <form className="ctf-access-form" onSubmit={submit} noValidate>
        {p.notice && !error && (
          <p className="ctf-notice" role="status">
            {p.notice}
          </p>
        )}
        {p.fields.map((f) => {
          const id = `${uid}-${f.name}`;
          const isPassword = f.type === "password";
          return (
            <div className="ctf-field" key={f.name}>
              <label htmlFor={id}>{f.label}</label>
              <div className={`ctf-input${f.icon ? " has-icon" : ""}`}>
                {f.icon && (
                  <span className="ctf-input-icon" aria-hidden="true">
                    {f.icon}
                  </span>
                )}
                <input
                  id={id}
                  name={f.name}
                  type={isPassword ? (show ? "text" : "password") : (f.type ?? "text")}
                  placeholder={f.placeholder}
                  autoComplete={f.autoComplete}
                  spellCheck={false}
                  autoCapitalize="off"
                  value={values[f.name]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  aria-invalid={Boolean(error)}
                />
                {isPassword && (
                  <button
                    type="button"
                    className="ctf-input-eye"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <AnimatePresence>
          {error && (
            <motion.p
              className="ctf-alert"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <ShieldAlert size={16} aria-hidden="true" />
              <span>{error}</span>
            </motion.p>
          )}
        </AnimatePresence>

        <button type="submit" className={`ctf-btn ctf-btn--cream ctf-btn--block${busy ? " is-busy" : ""}`} disabled={busy}>
          <span>{busy ? p.busyLabel : p.submitLabel}</span>
          {!busy && <kbd aria-hidden="true">Enter</kbd>}
        </button>
      </form>

      <div className="ctf-access-foot">
        <p>{p.footnote}</p>
      </div>
    </motion.div>
  );
}
