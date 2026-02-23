import { Metadata } from 'next';
import { AuditLogPage } from '@/components/admin-panel';

export const metadata: Metadata = {
  title: 'Log de Auditoría — YUMI Admin',
};

export default function AuditoriaPage() {
  return <AuditLogPage />;
}
