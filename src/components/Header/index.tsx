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
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  min-height: 56px; padding: 8px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.colors.bg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 390px) {
    gap: 6px;
    padding: 6px 8px;
  }
`;
const Brand = styled.span`
  display: inline-flex; align-items: center; gap: 4px;
  min-width: 0;
  font-weight: 600; color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
`;
const BrandTitle = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 640px) {
    display: none;
  }
`;
const Controls = styled.div`
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  flex: 1 1 auto;
  flex-wrap: wrap;
  min-width: 0;
  max-width: 100%;

  @media (max-width: 390px) {
    gap: 4px;
  }
`;
const Btn = styled.button`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; font-size: 12px; cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 6px;
  white-space: nowrap;

  @media (max-width: 390px) {
    gap: 4px;
    padding: 5px 7px;
    font-size: 11px;
  }
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
  white-space: nowrap;

  @media (max-width: 390px) {
    padding: 5px 7px;
    font-size: 11px;
  }
`;

const EmailText = styled.span`
  max-width: 120px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; color: ${({ theme }) => theme.colors.text};

  @media (max-width: 390px) {
    max-width: 88px;
    font-size: 11px;
  }
`;

const AuthCtaText = styled.span`
  @media (max-width: 390px) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
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
        <Brand aria-label={t('title')}>
          <span aria-hidden="true">▲</span>
          <BrandTitle>{t('title')}</BrandTitle>
        </Brand>
        <Controls>
          <NavLink href={dashboardHref} $active={!isSizer} aria-current={!isSizer ? 'page' : undefined}>{th('dashboard')}</NavLink>
          <NavLink href={sizerHref} $active={isSizer} aria-current={isSizer ? 'page' : undefined}>{th('sizer')}</NavLink>
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
            <Btn onClick={() => setAuthOpen(true)} aria-label={ta('cta')}>
              <span aria-hidden="true">🔐</span>
              <AuthCtaText>{ta('cta').replace(/^🔐\s*/, '')}</AuthCtaText>
            </Btn>
          )}
        </Controls>
      </Bar>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
