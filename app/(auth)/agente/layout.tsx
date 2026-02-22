import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AgentLayoutClient } from './layout-client';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

export const metadata = {
  title: 'YUMI · Panel Agente',
};

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
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

  if (!userData || !userData.is_active || !AGENT_ROLES.includes(userData.role)) {
    redirect('/login');
  }

  return <AgentLayoutClient>{children}</AgentLayoutClient>;
}
