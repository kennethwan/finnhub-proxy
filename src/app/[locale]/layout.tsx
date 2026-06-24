import { getMessages, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Providers from '@/components/Providers';
import { locales } from '@/i18n/config';
import type { ThemeMode } from '@/store/themeAtom';
import { TAB_COOKIE, parseTabCookie } from '@/lib/tabCookie';
import '../globals.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const cookieStore = await cookies();
  const initialTheme: ThemeMode = cookieStore.get('theme-mode')?.value === 'light' ? 'light' : 'dark';
  const initialTab = parseTabCookie(cookieStore.get(TAB_COOKIE)?.value);
  return (
    <html lang={locale} data-theme={initialTheme} style={{ colorScheme: initialTheme }} suppressHydrationWarning>
      <body>
        <Providers locale={locale} messages={messages as Record<string, unknown>} initialTheme={initialTheme} initialTab={initialTab}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
