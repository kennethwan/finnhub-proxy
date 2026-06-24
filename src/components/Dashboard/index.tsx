'use client';

import styled from 'styled-components';
import { useAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { activeTabAtom } from '@/store/uiAtom';
import type { ActiveTab } from '@/store/uiAtom';
import { usePricePolling } from '@/hooks/usePricePolling';
import { writeTabCookie } from '@/lib/tabCookie';
import AccountBar from '@/components/Summary/AccountBar';
import SizerWorkspace from '@/components/Sizer/SizerWorkspace';
import Positions from '@/components/Positions';
import History from '@/components/History';

// ── Styled components ────────────────────────────────────────────────────────

/** Top 3-tab switcher — same on every viewport */
const TabsRow = styled.div`
  display: flex;
  gap: 4px;
  max-width: 720px;
  margin: 0 auto;
  padding: 12px 16px 16px;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 9px 4px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  background: ${({ $active, theme }) => ($active ? theme.colors.accent : theme.colors.surface)};
  color: ${({ $active, theme }) => ($active ? theme.colors.accentText : theme.colors.textMuted)};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.accent : theme.colors.border)};
  transition: background 0.15s, color 0.15s;
`;

/** Container for the positions / history list panes (SizerWorkspace manages its own width) */
const ListContainer = styled.div`
  max-width: 920px;
  margin: 0 auto;
  padding: 0 16px;
`;

const Footer = styled.p`
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textFaint};
  margin: 24px auto 16px;
`;

// ── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const t = useTranslations('nav');
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);
  // Poll open-position quotes globally so NAV / total P/L (in the account bar)
  // stay live on every tab, not just while the positions tab is mounted.
  const polling = usePricePolling();

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'calculator', label: t('calculator') },
    { key: 'positions', label: t('positions') },
    { key: 'history', label: t('history') },
  ];

  return (
    <>
      <AccountBar />

      <TabsRow role="tablist">
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            $active={activeTab === tab.key}
            onClick={() => { setActiveTab(tab.key); writeTabCookie(tab.key); }}
          >
            {tab.label}
          </Tab>
        ))}
      </TabsRow>

      {activeTab === 'calculator' ? (
        <SizerWorkspace />
      ) : (
        <ListContainer>{activeTab === 'positions' ? <Positions polling={polling} /> : <History />}</ListContainer>
      )}

      <Footer>{t('footer')}</Footer>
    </>
  );
}
