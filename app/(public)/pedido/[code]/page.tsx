import { OrderTrackingClient } from '@/components/tracking/order-tracking-client';

interface TrackingPageProps {
  params: Promise<{ code: string }>;
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { code } = await params;

  return <OrderTrackingClient code={code.toUpperCase()} />;
}

export async function generateMetadata({ params }: TrackingPageProps) {
  const { code } = await params;
  const formatted = code.length === 6
    ? `${code.slice(0, 3).toUpperCase()}-${code.slice(3).toUpperCase()}`
    : code.toUpperCase();

  return {
    title: `Pedido ${formatted} — YUMI`,
    description: 'Sigue tu pedido en tiempo real',
  };
}
