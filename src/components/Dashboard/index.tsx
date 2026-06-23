'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { activeTabAtom, positionsSubtabAtom } from '@/store/uiAtom';
import type { ActiveTab, PositionsSubtab } from '@/store/uiAtom';
import Calculator from '@/components/Calculator';
import Positions from '@/components/Positions';
import History from '@/components/History';
import Segmented from '@/components/ui/Segmented';

// ── Styled components ────────────────────────────────────────────────────────

/** Centered outer container — used on both breakpoints */
const Container = styled.div<{ $maxWidth: number }>`
  max-width: ${({ $maxWidth }) => $maxWidth}px;
  margin: 0 auto;
  padding: 0 16px;
`;

/** Mobile 3-tab switcher row */
const MobileTabBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 0 16px;
`;

const MobileTab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 9px 4px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.accent : theme.colors.surface};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.accentText : theme.colors.textMuted};
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.accent : theme.colors.border};
  transition: background 0.15s, color 0.15s;
`;

/** Desktop 2-column grid */
const DesktopGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(360px, 420px) 1fr;
  gap: 24px;
  padding: 24px 0;
`;

/** Left sticky rail */
const StickyRail = styled.div`
  position: sticky;
  top: 72px;
  align-self: start;
`;

/** Right column content */
const RightCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 0;
`;

/** Shared footer */
const Footer = styled.p`
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textFaint};
  margin: 24px 0 16px;
`;

// ── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const t = useTranslations('nav');
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);
  const [subtab, setSubtab] = useAtom(positionsSubtabAtom);

  // SSR-safe viewport detection.
  // Tradeoff: crossing the 1024px breakpoint remounts all panes — acceptable
  // because it avoids the double-mount/SSR hydration issues of rendering two
  // copies of stateful components behind CSS display:none.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const mobileTabs: { key: ActiveTab; label: string }[] = [
    { key: 'calculator', label: t('calculator') },
    { key: 'positions', label: t('positions') },
    { key: 'history', label: t('history') },
  ];

  const subtabOptions: { key: PositionsSubtab; label: string }[] = [
    { key: 'positions', label: t('positions') },
    { key: 'history', label: t('history') },
  ];

  if (isDesktop) {
    return (
      <Container $maxWidth={1400}>
        <DesktopGrid>
          {/* Left: Calculator rail — sticky */}
          <StickyRail>
            <Calculator />
          </StickyRail>

          {/* Right: Positions / History subtab */}
          <RightCol>
            <Segmented
              options={subtabOptions}
              value={subtab}
              onChange={setSubtab}
            />
            {subtab === 'positions' ? <Positions /> : <History />}
          </RightCol>
        </DesktopGrid>

        <Footer>{t('footer')}</Footer>
      </Container>
    );
  }

  // Mobile layout
  return (
    <Container $maxWidth={640}>
      <MobileTabBar>
        {mobileTabs.map((tab) => (
          <MobileTab
            key={tab.key}
            $active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </MobileTab>
        ))}
      </MobileTabBar>

      {activeTab === 'calculator' ? (
        <Calculator />
      ) : activeTab === 'positions' ? (
        <Positions />
      ) : (
        <History />
      )}

      <Footer>{t('footer')}</Footer>
    </Container>
  );
}
