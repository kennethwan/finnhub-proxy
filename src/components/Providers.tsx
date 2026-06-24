'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'styled-components';
import { useAtomValue } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import JotaiProvider from '@/components/JotaiProvider';
import StyledComponentsRegistry from '@/styles/registry';
import { GlobalStyle } from '@/styles/globals';
import { darkTheme, lightTheme } from '@/styles/theme';
import { themeAtom, type ThemeMode } from '@/store/themeAtom';
import { activeTabAtom, type ActiveTab } from '@/store/uiAtom';
import { timeZone } from '@/i18n/config';

function ThemedShell({ children, initialTheme, initialTab }: { children: React.ReactNode; initialTheme: ThemeMode; initialTab: ActiveTab }) {
  useHydrateAtoms([[themeAtom, initialTheme], [activeTabAtom, initialTab]] as const);
  const mode = useAtomValue(themeAtom);
  return (
    <ThemeProvider theme={mode === 'light' ? lightTheme : darkTheme}>
      <GlobalStyle />
      {children}
    </ThemeProvider>
  );
}

export default function Providers({
  children, locale, messages, initialTheme, initialTab,
}: { children: React.ReactNode; locale: string; messages: Record<string, unknown>; initialTheme: ThemeMode; initialTab: ActiveTab }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <JotaiProvider>
        <StyledComponentsRegistry>
          <ThemedShell initialTheme={initialTheme} initialTab={initialTab}>{children}</ThemedShell>
        </StyledComponentsRegistry>
      </JotaiProvider>
    </NextIntlClientProvider>
  );
}
