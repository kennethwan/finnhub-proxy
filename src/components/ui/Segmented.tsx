'use client';
import styled from 'styled-components';

const Wrap = styled.div` display: inline-flex; width: 100%; padding: 2px; gap: 2px; border-radius: 8px; background: ${({ theme }) => theme.colors.bg}; border: 1px solid ${({ theme }) => theme.colors.border}; `;
const Item = styled.button<{ $active: boolean }>`
  flex: 1; padding: 8px 10px; border: none; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px;
  background: ${({ $active, theme }) => ($active ? theme.colors.accent : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.accentText : theme.colors.textMuted)};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
`;
export default function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (<Wrap>{options.map((o) => (<Item key={o.key} $active={o.key === value} onClick={() => onChange(o.key)}>{o.label}</Item>))}</Wrap>);
}
