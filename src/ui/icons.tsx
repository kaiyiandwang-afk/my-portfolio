import type { ReactNode } from 'react'
import type { SectionId } from '../content'

const paths: Record<SectionId, ReactNode> = {
  about: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.2-4 4.2-6 8-6s6.8 2 8 6" />
    </>
  ),
  projects: (
    <>
      <rect x="5" y="4" width="14" height="11" rx="2" />
      <path d="M2.5 19.5h19l-2-3.5h-15z" />
    </>
  ),
  research: (
    <>
      <path d="M5 4h4v16H5zM10 4h4v16h-4z" />
      <path d="m15.5 5 3.8-1 3.2 15.5-3.8 1z" />
    </>
  ),
  experience: (
    <>
      <path d="M12 3v5M7 8h10l1.5 6h-13z" />
      <path d="M12 14v7" />
    </>
  ),
  work: (
    <>
      <path d="M5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M9 3c-1 1.2 1 2 0 3.2M13 3c-1 1.2 1 2 0 3.2" />
    </>
  ),
  creative: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <circle cx="12" cy="13.5" r="3.6" />
      <path d="M8.5 7 10 4h4l1.5 3" />
    </>
  ),
  art: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
      <path d="m7 17 3.5-4.5 2.5 3 2-2.5L18 17" />
      <circle cx="9" cy="8.5" r="1.5" />
    </>
  ),
  cats: (
    <>
      <path d="M5 4.5 8.5 8a9 9 0 0 1 7 0L19 4.5V13a7 7 0 0 1-14 0z" />
      <path d="M9.5 13h.01M14.5 13h.01M12 16l-1.2-1h2.4z" />
    </>
  ),
  interests: (
    <>
      <path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" />
      <path d="M8 21h8M9 7c-1-1.3 1-2.2 0-3.5M15 7c-1-1.3 1-2.2 0-3.5" />
    </>
  ),
  contact: (
    <path d="M6 3.5h3l1.5 4.5-2 1.5a12 12 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.7a2 2 0 0 1 2-2.2z" />
  ),
}

export const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

/** The little drawing of the object that opens each section. */
export function SectionIcon({ id }: { id: SectionId }) {
  return <svg {...iconProps}>{paths[id]}</svg>
}
