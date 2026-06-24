'use client';
import styled from 'styled-components';
import InfoTip from './InfoTip';

const Box = styled.div<{ $accent?: boolean }>`
  border: 1px solid ${({ $accent, theme }) => ($accent ? theme.colors.positive : theme.colors.border)};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px; padding: 10px 12px;
`;
const LabelRow = styled.div` display: flex; align-items: center; gap: 4px; `;
const Label = styled.p` font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: ${({ theme }) => theme.colors.textMuted}; `;
const Value = styled.p<{ $tone?: 'pos'|'neg'|'muted' }>`
  font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums;
  font-size: 18px; font-weight: 600; margin-top: 4px;
  color: ${({ $tone, theme }) => $tone === 'pos' ? theme.colors.positive : $tone === 'neg' ? theme.colors.negative : $tone === 'muted' ? theme.colors.textFaint : theme.colors.text};
`;
export default function StatTile({ label, value, tone, accent, info }: { label: string; value: React.ReactNode; tone?: 'pos'|'neg'|'muted'; accent?: boolean; info?: React.ReactNode }) {
  return (
    <Box $accent={accent}>
      <LabelRow>
        <Label>{label}</Label>
        {info != null && <InfoTip label={label}>{info}</InfoTip>}
      </LabelRow>
      <Value $tone={tone}>{value}</Value>
    </Box>
  );
}
