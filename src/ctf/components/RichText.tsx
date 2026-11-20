import { Fragment } from "react";

// http(s) links, stopping before trailing punctuation like "." or ")".
const URL_RE = /(https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)\]])/g;

/**
 * Organiser-written text shown exactly as typed: new lines, blank lines and
 * spaces are kept (CSS white-space: pre-wrap on the container), and http(s)
 * links become clickable. React escapes everything else, so no HTML or
 * script in the text can run.
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} className="ctf-link" href={part} target="_blank" rel="noopener noreferrer nofollow">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
