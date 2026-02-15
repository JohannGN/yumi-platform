import { BackButton } from '@/components/shared/back-button';

interface ItemPageProps {
  params: Promise<{ city: string; restaurant: string; itemId: string }>;
}

export default async function ItemDetailPage({ params }: ItemPageProps) {
  const { city, restaurant, itemId } = await params;

  return (
    <div className="p-4">
      <BackButton href={`/${city}/${restaurant}`} label="Volver al menú" />
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-700">
        Detalle del item {itemId} — por implementar
      </div>
    </div>
  );
}
