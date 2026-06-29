# ✨ generate-bio — Asistente IA del panel del vendedor

Genera título, bio (ES/EN) y slogan del técnico a partir de unas notas, usando
Claude. La API key de Anthropic vive como **secret del servidor** (nunca en el
cliente Vite).

## Desplegar (una vez)

Necesitas el [Supabase CLI](https://supabase.com/docs/guides/cli) y una API key de
Anthropic (https://console.anthropic.com → API Keys).

```bash
# 1. Enlaza tu proyecto (si aún no lo hiciste)
supabase login
supabase link --project-ref TU_PROJECT_REF

# 2. Guarda la API key como secret (NO va en .env del front)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 3. Despliega la función
supabase functions deploy generate-bio
```

Listo. En la pantalla del técnico (Editar perfil → Perfil profesional) aparece
**✨ Escribir por mí**; el botón llama a esta función.

## Failsafe

Si **no** despliegas la función, la app no se rompe: el botón muestra un aviso
("El asistente IA aún no está disponible…") y el técnico sigue llenando su perfil
a mano como siempre.

## Notas

- Modelo por defecto: `claude-opus-4-8`. Para abaratar/acelerar, cambia a
  `claude-haiku-4-5` en `index.ts` (línea del `model`).
- Usa salida estructurada (`output_config.format`) → JSON válido garantizado con
  los 5 campos.
- Costo: lo paga tu cuenta de Anthropic por uso (una generación ≈ centavos).
