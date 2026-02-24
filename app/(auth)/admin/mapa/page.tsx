import { Metadata } from 'next';
import { OperationalMap } from '@/components/admin-panel';

export const metadata: Metadata = {
  title: 'Mapa Operativo — YUMI Admin',
};

export default function MapaPage() {
  return <OperationalMap />;
}
