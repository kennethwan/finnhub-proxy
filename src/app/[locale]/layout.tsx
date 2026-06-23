import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Providers from '@/components/Providers';
import { locales } from '@/i18n/config';
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
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Anti-flash: set page background + color-scheme from stored theme before first paint (spec §10) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme-mode');if(t!=='light'&&t!=='dark')t='dark';var e=document.documentElement;e.style.background=t==='light'?'#f7f7f5':'#0a0b0d';e.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers locale={locale} messages={messages as Record<string, unknown>}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
