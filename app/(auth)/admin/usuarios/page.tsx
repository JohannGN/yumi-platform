import { Metadata } from 'next';
import { UsersListPage } from '@/components/admin-panel';

export const metadata: Metadata = {
  title: 'Gestión de Usuarios — YUMI Admin',
};

export default function UsuariosPage() {
  return <UsersListPage />;
}
