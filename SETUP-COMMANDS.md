# YUMI — Comandos de Setup (ejecutar en tu terminal local)

## PASO 1: Crear proyecto Next.js

```bash
npx create-next-app@latest yumi-platform \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src=no \
  --import-alias="@/*" \
  --use-npm
```

```bash
cd yumi-platform
```

## PASO 2: Instalar dependencias core

```bash
npm install @supabase/supabase-js @supabase/ssr zustand @tanstack/react-query framer-motion @react-google-maps/api lucide-react
```

## PASO 3: Instalar shadcn/ui

```bash
npx shadcn@latest init -d
```

Cuando pregunte, seleccionar:
- Style: **Default**
- Base color: **Neutral**
- CSS variables: **Yes**

Luego instalar componentes esenciales:

```bash
npx shadcn@latest add button dialog drawer sheet badge skeleton input label toast alert-dialog separator scroll-area
```

## PASO 4: Copiar .env.local

Copia el archivo `YUMI-ENV-CONFIG.env` como `.env.local` en la raíz del proyecto:

```bash
cp .env.local.example .env.local
```

## PASO 5: Copiar archivos de fundación

Copia TODOS los archivos generados en la carpeta `yumi-foundation/` a tu proyecto, respetando la estructura de carpetas.

## PASO 6: Verificar que corre

```bash
npm run dev
```

Abrir http://localhost:3000 — deberías ver la home de YUMI con selector de ciudad.
