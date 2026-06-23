import { useTranslations } from 'next-intl';

export default function DashboardPage() {
  return <Placeholder />;
}

function Placeholder() {
  const t = useTranslations('app');
  return (
    <main style={{ padding: 32 }}>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </main>
  );
}
