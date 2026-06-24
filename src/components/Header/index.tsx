'use client';

import { useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { useAtom } from 'jotai';
import { Sun, Moon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { themeAtom } from '@/store/themeAtom';
import { writeThemeCookie } from '@/lib/themeCookie';
import { currencyAtom } from '@/store/currencyAtom';
import { locales } from '@/i18n/config';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from '@/components/AuthModal';

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
const NavLink = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  color: ${({ $active, theme }) => $active ? theme.colors.accentText : theme.colors.text};
  background: ${({ $active, theme }) => $active ? theme.colors.accent : 'transparent'};
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.border};
  border-radius: 6px;
  text-decoration: none;
`;

const EmailText = styled.span`
  max-width: 120px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; color: ${({ theme }) => theme.colors.text};
`;

export default function Header() {
  const t = useTranslations('app');
  const th = useTranslations('header');
  const ta = useTranslations('auth');
  const [mode, setMode] = useAtom(themeAtom);
  const [currency, setCurrency] = useAtom(currencyAtom);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const dashboardHref = `/${locale}`;
  const sizerHref = `/${locale}/sizer`;
  const isSizer = pathname.endsWith('/sizer');

  const switchLocale = () => {
    const next = locales.find((l) => l !== locale) ?? locale;
    router.push(pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${next}`));
  };

  return (
    <>
      <Bar>
        <Brand>▲ {t('title')}</Brand>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <NavLink href={dashboardHref} $active={!isSizer}>{th('dashboard')}</NavLink>
          <NavLink href={sizerHref} $active={isSizer}>{th('sizer')}</NavLink>
          <Btn onClick={() => setCurrency(currency === 'USD' ? 'HKD' : 'USD')} aria-label={`${currency} currency`}>
            {currency === 'USD' ? '🇺🇸 USD' : '🇭🇰 HKD'}
          </Btn>
          <Btn onClick={switchLocale} aria-label={th('language')}>{locale === 'zh-HK' ? 'EN' : '中'}</Btn>
          <Btn onClick={() => { const next = mode === 'dark' ? 'light' : 'dark'; setMode(next); writeThemeCookie(next); }} aria-label={th('theme')}>
            {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </Btn>
          {user ? (
            <>
              <EmailText title={user.email ?? ''}>{user.email ?? ''}</EmailText>
              <Btn onClick={signOut}>{ta('logout')}</Btn>
            </>
          ) : (
            <Btn onClick={() => setAuthOpen(true)}>{ta('cta')}</Btn>
          )}
        </div>
      </Bar>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
