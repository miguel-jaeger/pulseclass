export function Logo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 46" className={className} aria-label="PulseClass">
      <g transform="translate(2 7)">
        <circle cx="16" cy="16" r="16" fill="#9e001f" />
        <path d="M16 25 C9 20.5 6.5 16 6.5 12.5 C6.5 9.5 8.5 7.5 11 7.5 C13.2 7.5 14.8 8.8 16 10.8 C17.2 8.8 18.8 7.5 21 7.5 C23.5 7.5 25.5 9.5 25.5 12.5 C25.5 16 23 20.5 16 25 Z" fill="#ffffff" />
        <path d="M10.5 15.5 L13 15.5 L15 12 L17 19 L19 15.5 L21.5 15.5" fill="none" stroke="#9e001f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(0 -7) rotate(15 28 13)">
        <path d="M37 13 L37 20.4" fill="none" stroke="#9e001f" strokeWidth="2" strokeLinecap="round" />
        <circle cx="37" cy="21.4" r="1.8" fill="#9e001f" />
        <path d="M23.6 15.2 L32.4 15.2 L32 21.5 Q28 22.5 24 21.5 Z" fill="#ffffff" stroke="#9e001f" strokeWidth="0.9" strokeLinejoin="round" />
        <path d="M28 8.4 L37 13 L28 17.6 L19 13 Z" fill="#ffffff" stroke="#9e001f" strokeWidth="0.9" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
