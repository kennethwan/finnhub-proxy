'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

const Trigger = styled.button`
  width: 15px; height: 15px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 10px; font-weight: 700; font-style: italic; line-height: 1;
  cursor: pointer; padding: 0;
  transition: color 0.15s, border-color 0.15s;
  &:hover { color: ${({ theme }) => theme.colors.text}; border-color: ${({ theme }) => theme.colors.textMuted}; }
`;

const Pop = styled.div`
  position: fixed; z-index: 1000;
  max-width: 260px; padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 11.5px; line-height: 1.55; font-weight: 400;
  text-transform: none; letter-spacing: normal; text-align: left;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
`;

interface InfoTipProps { label: string; children: React.ReactNode }

/** A small "i" button that toggles a short explanatory popover. The popover is
 *  portalled to <body> and clamped to the viewport so it never clips, on desktop
 *  or mobile. Closes on outside-click or Escape. */
export default function InfoTip({ label, children }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      const margin = 8;
      const popW = Math.min(260, window.innerWidth - margin * 2);
      let left = r.left;
      if (left + popW > window.innerWidth - margin) left = window.innerWidth - margin - popW;
      if (left < margin) left = margin;
      setCoords({ top: r.bottom + 6, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <Trigger
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        i
      </Trigger>
      {open && coords != null && typeof document !== 'undefined' && createPortal(
        <Pop ref={popRef} id={id} role="tooltip" style={{ top: coords.top, left: coords.left }}>
          {children}
        </Pop>,
        document.body,
      )}
    </>
  );
}
