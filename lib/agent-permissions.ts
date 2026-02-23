// ============================================================
// YUMI PLATFORM — Agent Permissions Helper
// Chat: AGENTE-3
// ============================================================
// Uso: import { checkAgentPermission } from '@/lib/agent-permissions';
// Verificar server-side en CADA API de agente que requiera permiso.
// ============================================================

import type { AgentPermissions } from '@/types/agent-panel';
import { createServiceRoleClient } from '@/lib/supabase/server';

const DEFAULT_PERMISSIONS: AgentPermissions = {
  can_cancel_orders: true,
  can_toggle_restaurants: true,
  can_manage_menu_global: true,
  can_disable_menu_items: true,
  can_view_riders: true,
  can_create_orders: true,
  can_manage_escalations: true,
  can_view_finance_daily: true,
  can_view_finance_weekly: true,
};

/**
 * Fetch all permissions for an agent. Returns defaults if no record exists.
 * Owner and city_admin always get all true (bypass).
 */
export async function getAgentPermissions(
  userId: string,
  userRole: string
): Promise<AgentPermissions> {
  // Owner y city_admin siempre tienen todo
  if (userRole === 'owner' || userRole === 'city_admin') {
    return { ...DEFAULT_PERMISSIONS };
  }

  const sc = createServiceRoleClient();
  const { data } = await sc
    .from('agent_permissions')
    .select('permissions')
    .eq('user_id', userId)
    .single();

  if (!data) {
    // No record → defaults (all true)
    return { ...DEFAULT_PERMISSIONS };
  }

  // Merge with defaults para cubrir nuevos permisos que se agreguen
  return { ...DEFAULT_PERMISSIONS, ...(data.permissions as Partial<AgentPermissions>) };
}

/**
 * Check a specific permission for an agent.
 * Owner and city_admin always return true.
 */
export async function checkAgentPermission(
  userId: string,
  userRole: string,
  permission: keyof AgentPermissions
): Promise<boolean> {
  const perms = await getAgentPermissions(userId, userRole);
  return perms[permission] === true;
}
