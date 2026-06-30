# ➕ admin-create-vendor — El dueño crea cuentas de vendedor

Permite que un **admin** cree la cuenta de un vendedor (técnico) y reciba las
credenciales para entregárselas. Convive con el auto-registro normal.

## Seguridad

- Usa la **service role key** de Supabase, que SOLO vive dentro de la función
  (Supabase la inyecta como variable de entorno). Nunca llega al cliente Vite.
- Antes de crear nada, verifica que quien llama tenga `role = 'admin'`.

## Desplegar (una vez)

```bash
supabase functions deploy admin-create-vendor
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya las inyecta
Supabase automáticamente — **no** hay que setear ningún secret.

## Cómo se usa

App → **👤 Perfil → Panel de administrador → pestaña 🛠️ Técnicos →
➕ Crear cuenta de vendedor**. Llenas nombre y email (contraseña opcional; vacía
= se genera), y te devuelve email + contraseña para copiar y entregar.

## Failsafe

Si **no** despliegas la función, el botón muestra un aviso
("admin-create-vendor aún no está desplegada") y el resto de la app sigue igual.
El auto-registro de vendedores funciona sin esta función.
