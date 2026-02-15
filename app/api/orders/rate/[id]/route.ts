import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rating, comment } = body;

    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating debe ser un número entre 1 y 5' },
        { status: 400 }
      );
    }

    // Validate comment length
    if (comment && typeof comment === 'string' && comment.length > 500) {
      return NextResponse.json(
        { error: 'Comentario muy largo (máx. 500 caracteres)' },
        { status: 400 }
      );
    }

    // Check order exists and is delivered
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, customer_rating')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (order.status !== 'delivered') {
      return NextResponse.json(
        { error: 'Solo se pueden calificar pedidos entregados' },
        { status: 400 }
      );
    }

    // Allow re-rating (update)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        customer_rating: Math.round(rating),
        customer_comment: comment?.trim() || null,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Rate update error:', updateError);
      return NextResponse.json({ error: 'Error al guardar calificación' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rating: Math.round(rating) });
  } catch (err) {
    console.error('Rate order error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
