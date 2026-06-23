'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'styled-components';
import { useAtomValue } from 'jotai';
import JotaiProvider from '@/components/JotaiProvider';
import StyledComponentsRegistry from '@/styles/registry';
import { GlobalStyle } from '@/styles/globals';
import { darkTheme, lightTheme } from '@/styles/theme';
import { themeAtom } from '@/store/themeAtom';
import { timeZone } from '@/i18n/config';

function ThemedShell({ children }: { children: React.ReactNode }) {
  const mode = useAtomValue(themeAtom);
  return (
    <ThemeProvider theme={mode === 'light' ? lightTheme : darkTheme}>
      <GlobalStyle />
      {children}
    </ThemeProvider>
  );
}

export default function Providers({
  children, locale, messages,
}: { children: React.ReactNode; locale: string; messages: Record<string, unknown> }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <JotaiProvider>
        <StyledComponentsRegistry>
          <ThemedShell>{children}</ThemedShell>
        </StyledComponentsRegistry>
      </JotaiProvider>
    </NextIntlClientProvider>
  );
}
