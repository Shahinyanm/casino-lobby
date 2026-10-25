import type { SlotSymbol } from '@lobby/contracts';
import type { ReactNode } from 'react';

// Printed on an ivory reel in both themes, so the colors are fixed.
const ART: Record<SlotSymbol, ReactNode> = {
  seven: (
    <path
      d="M11 9h27v5L25 41h-8l12.5-25H15v4h-4Z"
      fill="#c0303f"
      stroke="#6e1520"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  bar: (
    <>
      <rect x="4" y="14" width="40" height="20" rx="4" fill="#1d2b24" />
      <rect x="7" y="17" width="34" height="14" rx="2" fill="none" stroke="#d9b25f" strokeWidth="1.5" />
      <path d="M13 20.5h3.6a2.2 2.2 0 0 1 .9 4.1 2.3 2.3 0 0 1-.8 4.4H13ZM13 24.6h4.5M22.5 29l2.8-8.5h1.9L30 29m-6.2-2.6h4.2M32 29v-8.5h3a2.4 2.4 0 0 1 0 4.8h-3m3 0 2.4 3.7" fill="none" stroke="#f3ead2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  bell: (
    <>
      <path d="M24 8c-7.5 0-11.5 5.6-11.5 13v7.5L8.5 34h31l-4-5.5V21C35.5 13.6 31.5 8 24 8Z" fill="#e0a93b" stroke="#8a5a12" strokeWidth="2" strokeLinejoin="round" />
      <path d="M17 20c.4-3.4 2.3-6 5-7" fill="none" stroke="#fbe6a8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="38.5" r="4" fill="#8a5a12" />
      <circle cx="24" cy="6.5" r="2.5" fill="#8a5a12" />
    </>
  ),
  lemon: (
    <>
      <path d="M6 26c1.5-9 10-15 19-14 8 .8 15 6 17 12.5L44 25l-2 1c-1.5 8-10 13.5-19 12.5C14 37.5 7.5 33 6.5 27L4 26Z" fill="#f1cd3f" stroke="#a7820f" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 22c2.5-3 6-4.5 10-4.5" fill="none" stroke="#fdf1b0" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  cherry: (
    <>
      <path d="M16 30c1.5-9 7-16 16-21m-1 21c-1-8-1-15 1-21" fill="none" stroke="#3f6b2c" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 9c4-4 9.5-4.5 12-1.5-3.5 3.5-8.5 4-12 1.5Z" fill="#4e8a36" />
      <circle cx="15" cy="35" r="8" fill="#c22a3c" stroke="#6e1520" strokeWidth="1.5" />
      <circle cx="31" cy="34" r="8" fill="#a8202f" stroke="#6e1520" strokeWidth="1.5" />
      <circle cx="12" cy="32" r="2" fill="#fff" opacity="0.65" />
      <circle cx="28" cy="31" r="2" fill="#fff" opacity="0.65" />
    </>
  ),
};

export function SymbolArt({ symbol }: { symbol: SlotSymbol }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {ART[symbol]}
    </svg>
  );
}
