import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Obtener paths de las fotos
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('delivery_proof_url, payment_proof_url')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Generar signed URLs (10 minutos = 600 segundos)
    const EXPIRY = 600;
    let delivery_proof_signed_url: string | null = null;
    let payment_proof_signed_url: string | null = null;

    if (order.delivery_proof_url) {
      // Extraer path relativo del bucket (quitar el prefijo storage)
      const path = extractStoragePath(order.delivery_proof_url);
      if (path) {
        const { data } = await supabase.storage
          .from('yumi-evidence')
          .createSignedUrl(path, EXPIRY);
        delivery_proof_signed_url = data?.signedUrl ?? null;
      }
    }

    if (order.payment_proof_url) {
      const path = extractStoragePath(order.payment_proof_url);
      if (path) {
        const { data } = await supabase.storage
          .from('yumi-evidence')
          .createSignedUrl(path, EXPIRY);
        payment_proof_signed_url = data?.signedUrl ?? null;
      }
    }

    return NextResponse.json({
      delivery_proof_signed_url,
      payment_proof_signed_url,
    });

  } catch (err) {
    console.error('[admin/evidence/[orderId] GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Extrae el path relativo dentro del bucket desde la URL completa de Supabase Storage
function extractStoragePath(url: string): string | null {
  try {
    // URL format: https://<project>.supabase.co/storage/v1/object/yumi-evidence/<path>
    const match = url.match(/yumi-evidence\/(.+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
