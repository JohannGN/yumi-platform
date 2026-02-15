import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/?auth=required');
  }

  // Fetch user role
  const { data: userData } = await supabase
    .from('users')
    .select('role, city_id, name')
    .eq('id', user.id)
    .single();

  if (!userData) {
    redirect('/?auth=required');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {children}
    </div>
  );
}
