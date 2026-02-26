import { SupabaseClient } from '@supabase/supabase-js';

interface AuditParams {
  userId: string;
  action: 'create' | 'update' | 'delete' | 'toggle' | 'assign';
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Insert an audit log entry. Fire-and-forget — never throws.
 * audit_log is append-only: NEVER UPDATE or DELETE.
 *
 * Accepts two signatures:
 *   logAuditAction(supabase, { userId, action, entityType, entityId?, details? })
 *   logAuditAction(supabase, userId, action, entityType, entityId?, details?)
 */
export async function logAuditAction(
  supabase: SupabaseClient,
  paramsOrUserId: AuditParams | string,
  action?: string,
  entityType?: string,
  entityId?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  const params: AuditParams =
    typeof paramsOrUserId === 'string'
      ? {
          userId: paramsOrUserId,
          action: action as AuditParams['action'],
          entityType: entityType!,
          entityId: entityId ?? null,
          details: details ?? {},
        }
      : paramsOrUserId;

  try {
    await supabase.from('audit_log').insert({
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      details: params.details ?? {},
    });
  } catch (err) {
    // Silently fail — audit should never break main flow
    console.error('[audit_log] Failed to insert:', err);
  }
}
