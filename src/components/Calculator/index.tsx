'use client';

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAtom, useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { calculatePosition } from '@/lib/finance';
import { formatCurrency, getSymbolCurrency } from '@/lib/format';
import { useTrades } from '@/hooks/useTrades';
import { currencyAtom } from '@/store/currencyAtom';
import { capitalAtom } from '@/store/capitalAtom';
import { fullPositionPctAtom } from '@/store/fullPositionAtom';
import type { Trade } from '@/types/trade';

// ── Styled components ────────────────────────────────────────────────────────

const Card = styled.div`
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CardTitle = styled.h2`
  font-size: 14px; font-weight: 600; margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const CardTag = styled.span`
  font-size: 10px; font-family: monospace; letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Body = styled.div`
  padding: 16px;
  display: flex; flex-direction: column; gap: 14px;
`;

const Row2 = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
`;

const FieldWrap = styled.div``;

const Lbl = styled.label`
  display: block; font-size: 11px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 6px;
`;

const Inp = styled.input`
  width: 100%; padding: 10px 12px; border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-family: inherit; font-variant-numeric: tabular-nums;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.accent}; }
`;

const InpRelative = styled.div`
  position: relative;
  & > input { padding-right: 36px; }
`;

const PctSuffix = styled.span`
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  font-family: monospace; font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.textMuted};
  pointer-events: none;
`;

const SegGroup = styled.div`
  display: inline-flex; width: 100%; padding: 2px; border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 8px;
`;

const Seg = styled.button<{ $active: boolean }>`
  flex: 1; padding: 6px 0; border: none; border-radius: 4px; cursor: pointer;
  font-size: 13px; font-family: inherit; transition: background 0.15s, color 0.15s;
  background: ${({ $active, theme }) => $active ? theme.colors.accent : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.accentText : theme.colors.textMuted};
  font-weight: ${({ $active }) => $active ? 600 : 400};
`;

const StopHint = styled.p`
  font-size: 11px; font-family: monospace; font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 6px 0 0;
`;

const ResultsWrap = styled.div`
  padding: 0 16px 16px;
  display: flex; flex-direction: column; gap: 10px;
`;

const ErrorCard = styled.div`
  padding: 12px 16px; border-radius: 8px; text-align: center; font-size: 13px;
  color: ${({ theme }) => theme.colors.negative};
  border: 1px solid ${({ theme }) => theme.colors.negative};
  background: ${({ theme }) => `${theme.colors.negative}18`};
`;

const HeroCard = styled.div`
  padding: 14px 16px; border-radius: 8px;
  border: 1px solid ${({ theme }) => `${theme.colors.accent}40`};
  background: ${({ theme }) => `${theme.colors.accent}12`};
`;

const HeroRow = styled.div`
  display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
`;

const HeroShares = styled.p`
  font-family: monospace; font-variant-numeric: tabular-nums;
  font-size: 36px; font-weight: 700; line-height: 1; margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.text};
`;

const HeroSharesUnit = styled.span`
  font-size: 14px; font-weight: 400; margin-left: 6px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const HeroRight = styled.div` text-align: right; `;

const SmallLbl = styled.p`
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.textMuted}; margin: 0;
`;

const SmallVal = styled.p`
  font-family: monospace; font-variant-numeric: tabular-nums;
  font-size: 13px; margin: 2px 0 0;
  color: ${({ theme }) => theme.colors.text};
`;

const SmallSub = styled.p<{ $warn?: boolean }>`
  font-family: monospace; font-variant-numeric: tabular-nums;
  font-size: 11px; margin: 1px 0 0;
  color: ${({ $warn, theme }) => $warn ? theme.colors.negative : theme.colors.accent};
`;

const RRRow = styled.div<{ $tier: 'good' | 'ok' | 'bad' }>`
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-radius: 8px;
  border: 1px solid ${({ $tier, theme }) =>
    $tier === 'good' ? theme.colors.positive :
    $tier === 'ok'   ? theme.colors.accent   : theme.colors.negative}40;
  background: ${({ $tier, theme }) =>
    $tier === 'good' ? theme.colors.positive :
    $tier === 'ok'   ? theme.colors.accent   : theme.colors.negative}18;
`;

const RRLbl = styled.span`
  font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const RRVal = styled.span`
  font-family: monospace; font-variant-numeric: tabular-nums;
  font-weight: 700; color: ${({ theme }) => theme.colors.text};
`;

const CellGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr;
  border-radius: 8px; overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  gap: 1px; background: ${({ theme }) => theme.colors.border};
`;

const Cell = styled.div`
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.surface};
`;

const ProfitRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-radius: 8px;
  border: 1px solid ${({ theme }) => `${theme.colors.positive}50`};
  background: ${({ theme }) => `${theme.colors.positive}12`};
`;

const ProfitLbl = styled.span`
  font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.positive};
`;

const ProfitVals = styled.span`
  display: flex; align-items: center; gap: 8px;
`;

const ProfitMain = styled.span`
  font-family: monospace; font-variant-numeric: tabular-nums;
  font-weight: 700; color: ${({ theme }) => theme.colors.text};
`;

const ProfitPct = styled.span`
  font-family: monospace; font-variant-numeric: tabular-nums;
  font-size: 12px; color: ${({ theme }) => theme.colors.positive};
`;

const AddBtn = styled.button<{ $enabled: boolean }>`
  width: 100%; padding: 10px; border: none; border-radius: 6px;
  font-size: 14px; font-weight: 600; font-family: inherit;
  cursor: ${({ $enabled }) => $enabled ? 'pointer' : 'not-allowed'};
  transition: background 0.15s;
  background: ${({ $enabled, theme }) => $enabled ? theme.colors.accent : `${theme.colors.textMuted}20`};
  color: ${({ $enabled, theme }) => $enabled ? theme.colors.accentText : theme.colors.textMuted};
`;

// ── Component ────────────────────────────────────────────────────────────────

export default function Calculator() {
  const t = useTranslations('calculator');
  const currency = useAtomValue(currencyAtom);
  const { addTrade } = useTrades();

  const [symbol, setSymbol] = useState('');
  const [capital, setCapital] = useAtom(capitalAtom);
  const [fullPositionPct, setFullPositionPct] = useAtom(fullPositionPctAtom);
  const [maxLossPercent, setMaxLossPercent] = useState('0.5');
  const [buyPrice, setBuyPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLossType, setStopLossType] = useState<'price' | 'percent'>('price');
  const [stopLoss, setStopLoss] = useState('');
  const [stopLossPercent, setStopLossPercent] = useState('');

  const stop = stopLossType === 'price'
    ? parseFloat(stopLoss)
    : parseFloat(buyPrice) * (1 - parseFloat(stopLossPercent) / 100);

  const result = useMemo(
    () => calculatePosition({
      capital: parseFloat(capital),
      buyPrice: parseFloat(buyPrice),
      stop,
      maxLossPercent: parseFloat(maxLossPercent),
      targetPrice: parseFloat(targetPrice) || null,
    }),
    [capital, buyPrice, stop, maxLossPercent, targetPrice],
  );

  const hasResult = result !== null;
  const isError = hasResult && 'error' in result;
  const isValid = hasResult && !isError;

  const canAdd = symbol.trim() !== '' && isValid;

  const handleAdd = async () => {
    if (!canAdd || !isValid || isError) return;
    const now = new Date().toISOString();
    const trade: Trade = {
      id: Date.now(),
      symbol: symbol.toUpperCase(),
      entryPrice: parseFloat(buyPrice),
      shares: (result as Exclude<typeof result, { error: string } | null>).shares,
      initialStopLoss: (result as Exclude<typeof result, { error: string } | null>).actualStopLoss,
      currentStopLoss: (result as Exclude<typeof result, { error: string } | null>).actualStopLoss,
      targetPrice: parseFloat(targetPrice) || null,
      status: 'open',
      riskAmount: (result as Exclude<typeof result, { error: string } | null>).actualRisk,
      createdAt: now,
      stopLossHistory: [{ price: (result as Exclude<typeof result, { error: string } | null>).actualStopLoss, date: now, note: '初始止損' }],
    };
    await addTrade(trade);
    setSymbol('');
    setBuyPrice('');
    setStopLoss('');
    setStopLossPercent('');
    setTargetPrice('');
  };

  const symCur = getSymbolCurrency(symbol);

  // Typed result helper (only call when isValid)
  type ValidResult = Exclude<typeof result, { error: string } | null>;
  const r = result as ValidResult;

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧮 {t('title')}</CardTitle>
        <CardTag>{t('sizerTag')}</CardTag>
      </CardHeader>

      <Body>
        {/* Symbol */}
        <FieldWrap>
          <Lbl>{t('symbol')}</Lbl>
          <Inp
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL · TSLA · 0700.HK"
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          />
        </FieldWrap>

        {/* Capital + maxLoss */}
        <Row2>
          <FieldWrap>
            <Lbl>{t('capital')}</Lbl>
            <Inp
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
            />
          </FieldWrap>
          <FieldWrap>
            <Lbl>{t('maxLoss')}</Lbl>
            <Inp
              type="number"
              value={maxLossPercent}
              step="0.1"
              onChange={(e) => setMaxLossPercent(e.target.value)}
            />
          </FieldWrap>
        </Row2>

        {/* Buy price + target */}
        <Row2>
          <FieldWrap>
            <Lbl>{t('buyPrice')}</Lbl>
            <Inp
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="150.00"
              step="0.01"
            />
          </FieldWrap>
          <FieldWrap>
            <Lbl>{t('targetPrice')}</Lbl>
            <Inp
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder={t('optional')}
              step="0.01"
            />
          </FieldWrap>
        </Row2>

        {/* Stop loss */}
        <FieldWrap>
          <Lbl>{t('stopLoss')}</Lbl>
          <SegGroup>
            <Seg $active={stopLossType === 'price'} onClick={() => setStopLossType('price')}>
              {t('price')}
            </Seg>
            <Seg $active={stopLossType === 'percent'} onClick={() => setStopLossType('percent')}>
              {t('percent')}
            </Seg>
          </SegGroup>

          {stopLossType === 'price' ? (
            <Inp
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder={t('stopPricePlaceholder')}
              step="0.01"
            />
          ) : (
            <InpRelative>
              <Inp
                type="number"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(e.target.value)}
                placeholder="5"
                step="0.1"
              />
              <PctSuffix>%</PctSuffix>
            </InpRelative>
          )}

          {stopLossType === 'percent' && buyPrice && stopLossPercent && (
            <StopHint>
              = {formatCurrency(parseFloat(buyPrice) * (1 - parseFloat(stopLossPercent) / 100), symCur, currency)}
            </StopHint>
          )}
        </FieldWrap>
        {/* Full-Position % setting */}
        <FieldWrap>
          <Lbl>{t('fullPositionLabel')}</Lbl>
          <InpRelative>
            <Inp
              type="number"
              value={fullPositionPct}
              step="0.1"
              min="0"
              max="100"
              onChange={(e) => setFullPositionPct(parseFloat(e.target.value) || 0)}
            />
            <PctSuffix>%</PctSuffix>
          </InpRelative>
        </FieldWrap>
      </Body>

      {/* Results */}
      {hasResult && (
        <ResultsWrap>
          {isError ? (
            <ErrorCard>❌ {(result as { error: string }).error}</ErrorCard>
          ) : (
            <>
              {/* Hero: suggested shares */}
              <HeroCard>
                <HeroRow>
                  <div>
                    <SmallLbl>{t('suggestedShares')}</SmallLbl>
                    <HeroShares>
                      {r.shares}<HeroSharesUnit>{t('shares')}</HeroSharesUnit>
                    </HeroShares>
                  </div>
                  <HeroRight>
                    <SmallLbl>{t('requiredCapital')}</SmallLbl>
                    <SmallVal>{formatCurrency(r.requiredCapital, symCur, currency)}</SmallVal>
                    <SmallSub $warn={r.capitalUsagePercent > 100}>
                      {r.capitalUsagePercent.toFixed(1)}% {t('ofCapital')}
                    </SmallSub>
                  </HeroRight>
                </HeroRow>
              </HeroCard>

              {/* R:R */}
              {r.riskRewardRatio != null && (
                <RRRow $tier={r.riskRewardRatio >= 2 ? 'good' : r.riskRewardRatio >= 1 ? 'ok' : 'bad'}>
                  <RRLbl>{t('riskReward')}</RRLbl>
                  <RRVal>1 : {r.riskRewardRatio.toFixed(2)}</RRVal>
                </RRRow>
              )}

              {/* Stop price + risk cells */}
              <CellGrid>
                <Cell>
                  <SmallLbl>{t('stopPrice')}</SmallLbl>
                  <SmallVal>{formatCurrency(r.actualStopLoss, symCur, currency)}</SmallVal>
                  <SmallSub $warn>-{r.stopLossPercentage.toFixed(1)}%</SmallSub>
                </Cell>
                <Cell>
                  <SmallLbl>{t('riskAmount')}</SmallLbl>
                  <SmallVal>{formatCurrency(r.actualRisk, symCur, currency)}</SmallVal>
                  <SmallSub>{r.actualRiskPercent.toFixed(2)}% {t('ofCapital')}</SmallSub>
                </Cell>
              </CellGrid>

              {/* Potential profit */}
              {r.potentialProfit != null && r.targetGainPercent != null && (
                <ProfitRow>
                  <ProfitLbl>{t('potentialProfit')}</ProfitLbl>
                  <ProfitVals>
                    <ProfitMain>{formatCurrency(r.potentialProfit, symCur, currency)}</ProfitMain>
                    <ProfitPct>+{r.targetGainPercent.toFixed(1)}%</ProfitPct>
                  </ProfitVals>
                </ProfitRow>
              )}

              {/* Add to positions */}
              <AddBtn $enabled={canAdd} onClick={handleAdd} disabled={!canAdd}>
                📋 {t('addTrade')}
              </AddBtn>
            </>
          )}
        </ResultsWrap>
      )}
    </Card>
  );
}
