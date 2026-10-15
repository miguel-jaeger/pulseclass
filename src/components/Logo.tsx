export function Logo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className} aria-label="PulseClass">
      <circle cx="16" cy="16" r="16" fill="#9e001f" />
      <path d="M16 24.5 C8 19 5 14.5 5 11 C5 8 7.8 5.5 10.6 5.5 C13 5.5 14.8 6.8 16 8.6 C17.2 6.8 19 5.5 21.4 5.5 C24.2 5.5 27 8 27 11 C27 14.5 24 19 16 24.5 Z" fill="#ffffff" />
      <path d="M9.5 14 L12.5 14 L14.5 10.5 L17.5 17.5 L19.5 14 L22.5 14" fill="none" stroke="#9e001f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
