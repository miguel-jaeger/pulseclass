export function Logo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className} aria-label="PulseClass">
      <circle cx="16" cy="16" r="16" fill="#9e001f" />
      <path d="M16 25 C9 20.5 6.5 16 6.5 12.5 C6.5 9.5 8.5 7.5 11 7.5 C13.2 7.5 14.8 8.8 16 10.8 C17.2 8.8 18.8 7.5 21 7.5 C23.5 7.5 25.5 9.5 25.5 12.5 C25.5 16 23 20.5 16 25 Z" fill="#ffffff" />
      <path d="M10.5 15.5 L13 15.5 L15 12 L17 19 L19 15.5 L21.5 15.5" fill="none" stroke="#9e001f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <g fill="#9e001f">
        <path d="M21 7.9 L23.2 9.5 L21 11.1 L18.8 9.5 Z" />
        <path d="M19.6 9.8 L22.4 9.8 L22 12 L20 12 Z" />
      </g>
      <path d="M23.2 9.5 L23.4 11.7" fill="none" stroke="#9e001f" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="23.4" cy="11.9" r="0.75" fill="#9e001f" />
    </svg>
  )
}
