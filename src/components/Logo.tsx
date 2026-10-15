export function Logo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className} aria-label="PulseClass">
      <circle cx="16" cy="16" r="16" fill="#9e001f" />
      <path d="M16 25.5 C8 20 5 15.5 5 12 C5 9 7.8 6.5 10.6 6.5 C13 6.5 14.8 7.8 16 9.6 C17.2 7.8 19 6.5 21.4 6.5 C24.2 6.5 27 9 27 12 C27 15.5 24 20 16 25.5 Z" fill="#ffffff" />
      <path d="M9.5 15 L12.5 15 L14.5 11.5 L17.5 18.5 L19.5 15 L22.5 15" fill="none" stroke="#9e001f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
