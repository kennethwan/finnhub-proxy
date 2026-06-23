import Header from '@/components/Header';
import Calculator from '@/components/Calculator';

export default function DashboardPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <Calculator />
      </main>
    </>
  );
}
