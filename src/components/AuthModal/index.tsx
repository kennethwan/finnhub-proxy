'use client';
import { useState } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import Field from '@/components/ui/Field';

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.7); padding: 16px;
`;
const Card = styled.div`
  width: 100%; max-width: 360px; border-radius: 12px; padding: 24px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;
const Primary = styled.button`
  width: 100%; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
  background: ${({ theme }) => theme.colors.accent}; color: #000;
`;
const Msg = styled.div<{ $ok: boolean }>`
  font-size: 13px; padding: 8px 12px; border-radius: 6px; margin-top: 4px;
  color: ${({ $ok, theme }) => ($ok ? theme.colors.positive : theme.colors.negative)};
  border: 1px solid ${({ $ok, theme }) => ($ok ? theme.colors.positive : theme.colors.negative)};
`;

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('auth');
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setMsg({ ok: true, text: t('signupSuccess') });
      } else {
        await signIn(email, password);
        onClose();
        setEmail(''); setPassword('');
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Error' });
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <strong>{mode === 'login' ? t('login') : t('signup')}</strong>
          <button onClick={onClose} aria-label="close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('email')} type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
          <Field label={t('password')} type="password" value={password} required minLength={6} onChange={(e) => setPassword(e.target.value)} />
          {msg && <Msg $ok={msg.ok}>{msg.text}</Msg>}
          <Primary type="submit">{mode === 'login' ? t('login') : t('signup')}</Primary>
        </form>
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null); }}
          style={{ marginTop: 16, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          {mode === 'login' ? t('toSignup') : t('toLogin')}
        </button>
      </Card>
    </Overlay>
  );
}
