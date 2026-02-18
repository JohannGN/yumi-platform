import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminLayoutClient } from './layout-client';

const ADMIN_ROLES = ['owner', 'city_admin', 'agent'];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();

  // Auth guard — server side
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Role check
  const { data: userData } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!userData || !userData.is_active || !ADMIN_ROLES.includes(userData.role)) {
    redirect('/login');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
