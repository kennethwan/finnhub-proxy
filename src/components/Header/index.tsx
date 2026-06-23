'use client';

import styled from 'styled-components';
import { useAtom } from 'jotai';
import { Sun, Moon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { themeAtom } from '@/store/themeAtom';
import { currencyAtom } from '@/store/currencyAtom';
import { locales } from '@/i18n/config';

const Bar = styled.header`
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  height: 56px; padding: 0 16px;
  background: ${({ theme }) => theme.colors.bg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;
const Brand = styled.span` font-weight: 600; color: ${({ theme }) => theme.colors.text}; `;
const Btn = styled.button`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; font-size: 12px; cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 6px;
`;

export default function Header() {
  const t = useTranslations('app');
  const th = useTranslations('header');
  const [mode, setMode] = useAtom(themeAtom);
  const [currency, setCurrency] = useAtom(currencyAtom);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = () => {
    const next = locales.find((l) => l !== locale) ?? locale;
    router.push(pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${next}`));
  };

  return (
    <Bar>
      <Brand>▲ {t('title')}</Brand>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={() => setCurrency(currency === 'USD' ? 'HKD' : 'USD')} aria-label={`${currency} currency`}>
          {currency === 'USD' ? '🇺🇸 USD' : '🇭🇰 HKD'}
        </Btn>
        <Btn onClick={switchLocale} aria-label={th('language')}>{locale === 'zh-HK' ? 'EN' : '中'}</Btn>
        <Btn onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} aria-label={th('theme')}>
          {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </Btn>
      </div>
    </Bar>
  );
}
