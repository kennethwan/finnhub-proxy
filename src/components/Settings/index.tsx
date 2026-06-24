'use client';

import styled from 'styled-components';
import { useAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import Field from '@/components/ui/Field';
import { capitalAtom } from '@/store/capitalAtom';
import { fullPositionPctAtom } from '@/store/fullPositionAtom';

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.7); padding: 16px;
`;
const Card = styled.div`
  width: 100%; max-width: 360px; border-radius: 12px; padding: 24px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;
const TitleRow = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;
`;
const Title = styled.strong` font-size: 16px; `;
const CloseBtn = styled.button`
  background: none; border: none; cursor: pointer; color: inherit; font-size: 18px; line-height: 1;
  padding: 4px 6px; border-radius: 4px;
  &:hover { opacity: 0.7; }
`;
const Fields = styled.div`
  display: flex; flex-direction: column; gap: 16px;
`;
const Hint = styled.p`
  font-size: 11px; line-height: 1.5; margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.textMuted};
`;
const Done = styled.button`
  width: 100%; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
  margin-top: 20px;
  background: ${({ theme }) => theme.colors.accent}; color: ${({ theme }) => theme.colors.accentText};
  &:hover { opacity: 0.9; }
`;

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('settings');
  const [capital, setCapital] = useAtom(capitalAtom);
  const [fullPositionPct, setFullPositionPct] = useAtom(fullPositionPctAtom);

  if (!open) return null;

  return (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <TitleRow>
          <Title>⚙️ {t('title')}</Title>
          <CloseBtn onClick={onClose} aria-label="close">✕</CloseBtn>
        </TitleRow>
        <Fields>
          <Field
            label={t('capital')}
            type="number"
            inputMode="decimal"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
          />
          <div>
            <Field
              label={t('fullPosition')}
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={fullPositionPct}
              onChange={(e) => setFullPositionPct(parseFloat(e.target.value) || 0)}
            />
            <Hint>{t('fullPositionHint')}</Hint>
          </div>
        </Fields>
        <Done onClick={onClose}>{t('done')}</Done>
      </Card>
    </Overlay>
  );
}
