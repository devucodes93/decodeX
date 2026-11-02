export default function RallyCar() {
  return (
    <g className="rally-car" aria-hidden="true">
      <ellipse cx="0" cy="4" rx="13" ry="20" fill="#000000" opacity="0.45" />
      <rect x="-14" y="-11" width="4" height="8" rx="1.5" fill="#0b0c09" />
      <rect x="10" y="-11" width="4" height="8" rx="1.5" fill="#0b0c09" />
      <rect x="-14" y="4" width="4" height="9" rx="1.5" fill="#0b0c09" />
      <rect x="10" y="4" width="4" height="9" rx="1.5" fill="#0b0c09" />
      <path
        d="M-9 17 L-12 9 C-13 2 -11 -5 -7 -11 L-5 -17 C-4 -19 -2 -20 0 -20 C2 -20 4 -19 5 -17 L7 -11 C11 -5 13 2 12 9 L9 17 C6 19 -6 19 -9 17 Z"
        fill="#f8f4e8"
        stroke="#11100c"
        strokeWidth="1.2"
      />
      <path
        d="M-6 -8 L6 -8 L7 -2 L-7 -2 Z"
        fill="#2a2c25"
        stroke="#11100c"
        strokeWidth="0.7"
      />
      <path
        d="M-5.5 -1 L5.5 -1 L4.5 6 L-4.5 6 Z"
        fill="#1f211b"
        stroke="#11100c"
        strokeWidth="0.6"
      />
      <path
        d="M-5 7 L5 7 L4 12 L-4 12 Z"
        fill="#2a2c25"
        stroke="#11100c"
        strokeWidth="0.6"
      />
      <path d="M0 -19 L0 16" stroke="#e7c46a" strokeWidth="1.1" opacity="0.9" />
      <path d="M-3 -18 L3 -18" stroke="#e7c46a" strokeWidth="1.4" />
      <circle cx="-5" cy="-17" r="1.6" fill="#e7c46a" />
      <circle cx="5" cy="-17" r="1.6" fill="#e7c46a" />
      <rect x="-5.5" y="15" width="3" height="1.6" rx="0.6" fill="#e8a15b" />
      <rect x="2.5" y="15" width="3" height="1.6" rx="0.6" fill="#e8a15b" />
      <path d="M-11 2 L-8 2 M8 2 L11 2" stroke="#11100c" strokeWidth="1" />
    </g>
  );
}
