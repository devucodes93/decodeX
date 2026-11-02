import { Link } from "react-router-dom";
import "./RegisterButton.css";

type RegisterButtonProps = {
  label?: string;
  className?: string;
} & ({ to: string; href?: never } | { href: string; to?: never });

export function RegisterButton({
  to,
  href,
  label = "Register Now",
  className = "",
}: RegisterButtonProps) {
  const classes = `register-btn${className ? ` ${className}` : ""}`;

  const content = (
    <>
      <span className="register-btn-label">{label}</span>
      <span className="register-btn-arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none">
          <path
            d="M4.2 11.8 11.8 4.2M5.6 4.2h6.2v6.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </>
  );

  if (to) {
    return (
      <Link className={classes} to={to} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <a
      className={classes}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      {content}
    </a>
  );
}
