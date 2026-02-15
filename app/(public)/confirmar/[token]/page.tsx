import { ConfirmPageClient } from '@/components/checkout/confirm-page-client';

interface ConfirmPageProps {
  params: Promise<{ token: string }>;
}

export default async function ConfirmPage({ params }: ConfirmPageProps) {
  const { token } = await params;

  return <ConfirmPageClient token={token} />;
}

export function generateMetadata() {
  return {
    title: 'Confirmar pedido — YUMI',
  };
}
