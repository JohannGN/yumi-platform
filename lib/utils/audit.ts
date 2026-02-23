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
 */
export async function logAuditAction(
  supabase: SupabaseClient,
  params: AuditParams
): Promise<void> {
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
