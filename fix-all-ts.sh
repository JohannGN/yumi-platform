#!/bin/bash
# ============================================================
# YUMI — SCRIPT DEFINITIVO: Arreglar TODOS los errores TypeScript
# Ejecutar desde la raíz del proyecto: bash fix-all-ts.sh
# 
# ANTES de ejecutar esto:
#   1. Copiar date-range-picker.tsx → components/shared/
#   2. Copiar export-csv-button.tsx → components/shared/
#   3. Copiar audit.ts → lib/utils/
#   4. Borrar: rm -f components/admin-panel/daily-report-detail.tsx components/admin-panel/daily-reports-table.tsx
# ============================================================

echo "=== 1. Agent APIs — implicit any ==="

# agent/orders/[id]/route.ts
sed -i 's/\.map((h) => h\.changed_by_user_id)/.map((h: Record<string, unknown>) => h.changed_by_user_id)/' "app/api/agent/orders/[id]/route.ts"
sed -i 's/\.map((h) => ({/.map((h: Record<string, unknown>) => ({/' "app/api/agent/orders/[id]/route.ts"

# agent/orders/route.ts
sed -i 's/\.map((ru) =>/.map((ru: Record<string, unknown>) =>/' "app/api/agent/orders/route.ts"
sed -i 's/restMap\[o\.restaurant_id\]/restMap[o.restaurant_id as string]/g' "app/api/agent/orders/route.ts"
sed -i 's/riderMap\[o\.rider_id\]/riderMap[o.rider_id as string]/g' "app/api/agent/orders/route.ts"
sed -i 's/riderUserMap\[o\.rider_id\]/riderUserMap[o.rider_id as string]/g' "app/api/agent/orders/route.ts"

# agent/restaurants/[id]/menu/route.ts
sed -i 's/\.map((item) => item\.id)/.map((item: Record<string, unknown>) => item.id)/' "app/api/agent/restaurants/[id]/menu/route.ts"
sed -i 's/\.map((i) => i/.map((i: Record<string, unknown>) => i/' "app/api/agent/restaurants/[id]/menu/route.ts"
sed -i 's/\.map((l) => l/.map((l: Record<string, unknown>) => l/g' "app/api/agent/restaurants/[id]/menu/route.ts"
sed -i 's/\.filter((l) => l/.filter((l: Record<string, unknown>) => l/g' "app/api/agent/restaurants/[id]/menu/route.ts"
sed -i 's/\.map((u) => ({/.map((u: Record<string, unknown>) => ({/' "app/api/agent/restaurants/[id]/menu/route.ts"
sed -i 's/\.map((item) => ({/.map((item: Record<string, unknown>) => ({/' "app/api/agent/restaurants/[id]/menu/route.ts"

# agent/restaurants/route.ts
sed -i 's/\.filter((r) => r\.pending_orders)/.filter((r: Record<string, unknown>) => r.pending_orders)/' "app/api/agent/restaurants/route.ts"
grep -q "sort((a:" "app/api/agent/restaurants/route.ts" || \
  sed -i 's/\.sort((a, b) =>/.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>/' "app/api/agent/restaurants/route.ts"

# agent/riders/route.ts
sed -i 's/\.map((o) => ({/.map((o: Record<string, unknown>) => ({/' "app/api/agent/riders/route.ts"
sed -i 's/orderMap\[r\.current_order_id\]/orderMap[r.current_order_id as string]/g' "app/api/agent/riders/route.ts"
grep -q "sort((a:" "app/api/agent/riders/route.ts" || \
  sed -i 's/\.sort((a, b) =>/.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>/' "app/api/agent/riders/route.ts"

echo "=== 2. AdminContextValue — agregar a types ==="
if ! grep -q "AdminContextValue" types/admin-panel.ts; then
cat >> types/admin-panel.ts << 'TSEOF'

export interface AdminContextValue {
  cityId: string | null;
  userRole: string;
  userName: string;
}
TSEOF
echo "  OK AdminContextValue agregado"
fi

echo "=== 3. audit-log-page.tsx — DateRange + toISOString ==="
sed -i "s/{ from: undefined, to: undefined }/{ from: '', to: '' }/" components/admin-panel/audit-log-page.tsx
sed -i 's/dateRange\.from\.toISOString()/dateRange.from/g' components/admin-panel/audit-log-page.tsx
sed -i 's/dateRange\.to\.toISOString()/dateRange.to/g' components/admin-panel/audit-log-page.tsx

echo "=== 4. expenses-table.tsx — ExpenseFilters city_id ==="
sed -i "s/useState<ExpenseFilters>({ limit:/useState<ExpenseFilters>({ city_id: '', limit:/" components/admin-panel/expenses-table.tsx
sed -i "s/{ limit: number; page: number/{ city_id: string; limit: number; page: number/" components/admin-panel/expenses-table.tsx

echo "=== 5. DateRangePicker onChange en callers ==="
sed -i 's/onChange={handleDateChange}/onChange={(range) => handleDateChange(range.from, range.to)}/' components/admin-panel/expenses-table.tsx
sed -i 's/onChange={handleDateChange}/onChange={(range) => handleDateChange(range.from, range.to)}/' components/admin-panel/pyl-dashboard.tsx

echo "=== 6. Expense type — agregar city_name ==="
if ! grep -q "city_name" types/expenses.ts; then
  sed -i 's/  creator_name: string;/  creator_name: string;\n  city_name?: string;/' types/expenses.ts
  echo "  OK city_name agregado a Expense"
fi

echo "=== 7. SettlementPreview — agregar fuel_reimbursement_cents ==="
for f in types/admin-panel.ts types/admin-panel-additions.ts; do
  if [ -f "$f" ] && grep -q "interface SettlementPreview" "$f"; then
    if ! grep -q "fuel_reimbursement_cents" "$f"; then
      sed -i '/interface SettlementPreview/,/}/ s/bonuses_cents: number;/bonuses_cents: number;\n  fuel_reimbursement_cents: number;/' "$f"
      echo "  OK fuel_reimbursement_cents agregado en $f"
    fi
  fi
done

echo "=== 8. operational-map.tsx — window cast ==="
sed -i 's/window as Record<string, unknown>/window as unknown as Record<string, unknown>/g' components/admin-panel/operational-map.tsx

echo "=== 9. order-detail-admin.tsx — OrderItem cast ==="
sed -i '/as unknown/!s/as Record<string, unknown>/as unknown as Record<string, unknown>/g' components/admin-panel/order-detail-admin.tsx

echo "=== 10. checkout — PaymentMethod a PaymentMethodType ==="
for f in components/checkout/step-order-summary.tsx components/checkout/step-payment-method.tsx; do
  sed -i "s/PaymentMethod }/PaymentMethodType }/" "$f"
  sed -i "s/PaymentMethod,/PaymentMethodType,/g" "$f"
  sed -i "s/: PaymentMethod;/: PaymentMethodType;/g" "$f"
  sed -i "s/import type { PaymentMethod/import type { PaymentMethodType/" "$f"
done

echo "=== 11. growth-metrics-widget.tsx — formatter type ==="
sed -i 's/formatter={(value: number) =>/formatter={(value: number | string) =>/' components/admin-panel/growth-metrics-widget.tsx

echo "=== 12. users-list-page.tsx — Shield title prop ==="
sed -i 's/<Shield className="w-4 h-4 text-purple-400 mx-auto" title="[^"]*" \/>/<span title="Propietario — no editable"><Shield className="w-4 h-4 text-purple-400 mx-auto" \/><\/span>/' components/admin-panel/users-list-page.tsx

echo "=== 13. agent-escalation-detail.tsx — unknown ReactNode ==="
sed -i 's/{String(msg\.content ?? msg\.message ?? JSON\.stringify(msg))}/{String((msg as Record<string, unknown>).content ?? (msg as Record<string, unknown>).message ?? JSON.stringify(msg))}/' components/agent-panel/agent-escalation-detail.tsx

echo ""
echo "=========================================="
echo "  LISTO. Ahora ejecuta:"
echo "  npx tsc --noEmit 2>&1 | grep 'error TS' | wc -l"
echo "=========================================="
