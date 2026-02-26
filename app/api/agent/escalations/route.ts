import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id, is_active')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.is_active || !AGENT_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('city_id');
    const status = searchParams.get('status');

    if (!cityId) {
      return NextResponse.json({ error: 'city_id requerido' }, { status: 400 });
    }

    // Validate city access
    if (userData.role === 'city_admin' && userData.city_id !== cityId) {
      return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
    }
    if (userData.role === 'agent') {
      const { data: ac } = await supabase
        .from('agent_cities')
        .select('id')
        .eq('user_id', user.id)
        .eq('city_id', cityId)
        .limit(1);

      if (!ac || ac.length === 0) {
        return NextResponse.json({ error: 'Sin acceso a esta ciudad' }, { status: 403 });
      }
    }

    const serviceClient = createServiceRoleClient();

    // Escalations don't have city_id directly, they link via related_order_id → orders.city_id
    // Get order ids for this city first
    let query = serviceClient
      .from('support_escalations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: escalations, error: escError } = await query;

    if (escError) {
      return NextResponse.json({ error: 'Error al cargar escalaciones' }, { status: 500 });
    }

    // Filter by city: check related_order_id city_id
    const orderIds = (escalations ?? [])
      .map((e: Record<string, unknown>) => e.related_order_id)
      .filter(Boolean) as string[];

    let orderCityMap: Record<string, string> = {};
    let orderCodeMap: Record<string, string> = {};

    if (orderIds.length > 0) {
      const { data: orders } = await serviceClient
        .from('orders')
        .select('id, city_id, code')
        .in('id', orderIds);

      for (const o of orders ?? []) {
        orderCityMap[o.id] = o.city_id;
        orderCodeMap[o.id] = o.code;
      }
    }

    // Filter escalations: those with orders in this city, or those without orders (general)
    const filteredEscalations = (escalations ?? []).filter((e: Record<string, unknown>) => {
      if (!e.related_order_id) return true; // No order linked — show in all cities
      return orderCityMap[e.related_order_id as string] === cityId;
    });

    // Get assigned_to names
    const assignedIds = [...new Set(
      filteredEscalations.map((e: Record<string, unknown>) => e.assigned_to_user_id).filter(Boolean) as string[]
    )];

    let assignedMap: Record<string, string> = {};
    if (assignedIds.length > 0) {
      const { data: assignedUsers } = await serviceClient
        .from('users')
        .select('id, name')
        .in('id', assignedIds);

      for (const u of assignedUsers ?? []) {
        assignedMap[u.id] = u.name;
      }
    }

    const flat = filteredEscalations.map((e: Record<string, unknown>) => ({
      id: e.id,
      customer_phone: e.customer_phone,
      escalation_reason: e.escalation_reason,
      priority: e.priority,
      status: e.status,
      conversation_context: e.conversation_context,
      assigned_to_user_id: e.assigned_to_user_id,
      assigned_to_name: e.assigned_to_user_id ? (assignedMap[e.assigned_to_user_id as string] ?? null) : null,
      related_order_id: e.related_order_id,
      related_order_code: e.related_order_id ? (orderCodeMap[e.related_order_id as string] ?? null) : null,
      chatwoot_conversation_id: e.chatwoot_conversation_id,
      resolution_notes: e.resolution_notes,
      created_at: e.created_at,
      resolved_at: e.resolved_at,
      updated_at: e.updated_at,
    }));

    return NextResponse.json(flat);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
