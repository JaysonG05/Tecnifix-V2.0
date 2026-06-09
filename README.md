# 🔧 Changuinola Pro — v2.0 (Producción)

App web + móvil de directorio de técnicos para Changuinola, Panamá.
Backend real con Supabase · Mapa OpenStreetMap · Pagos Yappy · Panel Admin

---

## 📁 Estructura final del proyecto

```
changuinola-pro/
├── .env                        ← TUS credenciales (no subir a git)
├── .env.example                ← Plantilla de variables
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                ← Punto de entrada
    ├── App.jsx                 ← Router principal
    ├── context/
    │   └── AppContext.jsx      ← Estado global + Supabase auth
    ├── lib/
    │   └── supabase.js         ← Todas las funciones de BD
    ├── i18n/
    │   └── translations.js     ← ES / EN completo
    ├── components/
    │   ├── UI.jsx              ← Avatar, Btn, Input, Modal, Toast...
    │   ├── TechnicianCard.jsx  ← Tarjeta reutilizable del técnico
    │   └── NavBar.jsx          ← Barra de navegación inferior
    └── screens/
        ├── HomeScreen.jsx
        ├── SearchScreen.jsx
        ├── MapScreen.jsx
        ├── TechProfileScreen.jsx
        └── SecondaryScreens.jsx  ← Profile, Login, Register, Settings,
                                     EditProfile, EditTechProfile,
                                     Admin, Notifications, Favorites
```

---

## 🚀 INSTALACIÓN PASO A PASO

### PASO 1 — Crear la cuenta de Supabase (gratis)

1. Ve a https://supabase.com y crea una cuenta gratuita
2. Crea un nuevo proyecto (elige el datacenter más cercano — Miami es ideal para Panamá)
3. Espera ~2 minutos mientras se inicializa

### PASO 2 — Crear la base de datos

1. En el dashboard de Supabase → **SQL Editor** → **New query**
2. Pega TODO el contenido del archivo `supabase_schema.sql`
3. Haz clic en **Run** (el botón verde)
4. Verás "Success" — ya tienes todas las tablas, RLS, storage buckets y funciones

### PASO 3 — Obtener tus credenciales

En Supabase → tu proyecto → **Settings** → **API**:
- Copia **Project URL** → es tu `VITE_SUPABASE_URL`
- Copia **anon public key** → es tu `VITE_SUPABASE_ANON_KEY`

### PASO 4 — Configurar el proyecto en VS Code

```bash
# 1. Crea la carpeta del proyecto
mkdir changuinola-pro
cd changuinola-pro

# 2. Crea la estructura de carpetas
mkdir -p src/context src/lib src/i18n src/components src/screens public

# 3. Copia los archivos descargados en sus ubicaciones:
#    Raíz:              index.html, package.json, vite.config.js, .env.example
#    public/            favicon.svg
#    src/               main.jsx, App.jsx
#    src/context/       AppContext.jsx
#    src/lib/           supabase.js
#    src/i18n/          translations.js
#    src/components/    UI.jsx, TechnicianCard.jsx, NavBar.jsx
#    src/screens/       HomeScreen.jsx, SearchScreen.jsx, MapScreen.jsx,
#                       TechProfileScreen.jsx, SecondaryScreens.jsx

# 4. Crea tu archivo .env (copia el ejemplo y rellena tus datos)
cp .env.example .env
# Abre .env en VS Code y pega tus credenciales de Supabase

# 5. Instala dependencias
npm install

# 6. Inicia la app
npm run dev
```

Abre http://localhost:3000 — ¡la app está corriendo!

### PASO 5 — Crear tu primer usuario admin

1. En la app, regístrate con cualquier email
2. En Supabase → **Table Editor** → tabla `profiles`
3. Busca tu usuario y cambia el campo `role` de `user` a `admin`
4. Cierra sesión en la app y vuelve a entrar
5. Ya tienes acceso al Panel de Administración

---

## ✅ Checklist de funcionalidades

### Autenticación (Supabase Auth — 100% real)
- [x] Registro con email/contraseña y rol (cliente/técnico)
- [x] Login con validación real en Supabase
- [x] Logout seguro con limpieza de sesión
- [x] Recuperación de contraseña por email
- [x] Sesión persistente (auto-refresh de JWT)
- [x] Perfil creado automáticamente al registrarse (trigger SQL)

### Perfil de usuario
- [x] Editar nombre, teléfono, WhatsApp
- [x] Subir foto de perfil real → guardada en Supabase Storage
- [x] Cambiar contraseña por email de recuperación
- [x] Preferencias guardadas en BD (idioma, modo oscuro, notificaciones)

### Perfil del técnico (solo rol técnico)
- [x] Editar título profesional (ES + EN)
- [x] Bio completa bilingüe
- [x] Precios mínimo/máximo con unidad
- [x] Ubicación con lat/lng para el mapa
- [x] Radio de servicio y tiempo de respuesta
- [x] Redes sociales (Instagram, Facebook, Sitio web)
- [x] Toggle de disponibilidad en tiempo real
- [x] Galería de trabajos → subir/eliminar fotos reales

### Búsqueda y mapa
- [x] Búsqueda en tiempo real contra Supabase
- [x] Filtros: categoría, verificados, disponibles
- [x] Ordenar: calificación, precio, reseñas
- [x] Mapa OpenStreetMap con Leaflet (sin API key, gratis)
- [x] Marcadores con foto real + calificación del técnico
- [x] Geolocalización del usuario con permiso del navegador
- [x] Función SQL de técnicos cercanos por radio (Haversine)
- [x] Popup del mapa con botón de WhatsApp directo

### Favoritos
- [x] Agregar/quitar favoritos guardados en Supabase
- [x] Sincronización en tiempo real entre dispositivos
- [x] Optimistic update (UI instantánea)

### Perfil del técnico (vista pública)
- [x] 3 tabs: Info / Galería / Reseñas
- [x] Estadísticas: calificación, reseñas, trabajos, experiencia
- [x] Botón WhatsApp con mensaje prellenado
- [x] Botón Email
- [x] Modal de solicitud de servicio (crea registro en BD)
- [x] Contrato digital con términos legales + firma con timestamp y hash SHA-256
- [x] Modal de pago Yappy con deep link

### Reseñas
- [x] Crear reseña con calificación de estrellas y comentario
- [x] Calificación promedio actualizada automáticamente (trigger SQL)
- [x] Moderación por admin

### Solicitudes de servicio
- [x] Crear solicitud con título, descripción, dirección, precio y método de pago
- [x] Ver historial de solicitudes en el perfil
- [x] Estados: pendiente, aceptado, en progreso, completado, cancelado

### Pagos Yappy
- [x] Deep link directo a la app Yappy del usuario
- [x] Fallback a web si no tiene la app instalada
- [x] Registro del pago en BD con referencia
- [x] Confirmación manual del pago realizado
- [x] Link de pago genera URL con monto y descripción

### Notificaciones
- [x] Lista de notificaciones en tiempo real (Supabase Realtime)
- [x] Badge con contador de no leídas en NavBar
- [x] Marcar todas como leídas
- [x] Vibración del dispositivo al recibir notificación nueva

### Configuración
- [x] Idioma: Español / English (persiste en localStorage + BD)
- [x] Modo oscuro/claro (persiste en localStorage + BD)
- [x] Notificaciones: push, email, SMS (guardado en BD)
- [x] Privacidad: mostrar teléfono/email, ubicación (guardado en BD)
- [x] Seguridad: 2FA toggle, cambiar contraseña, sesiones activas

### Panel de Administración
- [x] Dashboard con estadísticas (usuarios, técnicos, solicitudes, reseñas)
- [x] Gestión de usuarios: ver lista, suspender cuentas
- [x] Gestión de técnicos: verificar, marcar como destacado
- [x] Moderación de reseñas: aprobar o rechazar
- [x] Registro de auditoría (tabla admin_audit_logs)

---

## 💚 Pagos Yappy — Cómo funciona

Yappy es la billetera digital más usada en Panamá (Banco General).
**No tiene API pública REST**, así que el flujo es:

```
1. Usuario toca "Pagar con Yappy"
2. La app genera deep link: yappy://pay?phone=NUMBER&amount=X&description=Y
3. Se abre la app Yappy del usuario con el monto prellenado
4. El usuario completa el pago en su app Yappy
5. Regresa a Changuinola Pro y toca "Confirmar que ya pagué"
6. El pago queda registrado en la BD con referencia opcional
7. El técnico recibe notificación del pago
```

Para integrarse más profundamente con Yappy en el futuro,
contacta a Banco General para obtener acceso a su API comercial.

---

## 🔒 Seguridad implementada

- **Supabase Auth**: JWT con auto-refresh, contraseñas hasheadas con bcrypt
- **Row Level Security (RLS)**: cada usuario solo ve y modifica sus propios datos
- **Storage Policies**: las fotos de cada usuario solo las puede subir/eliminar él
- **Contrato digital**: hash SHA-256 del contenido + timestamp + user-agent
- **Variables de entorno**: ninguna clave secreta en el código fuente
- **NEVER** guarda contraseñas en localStorage (solo el token JWT de Supabase)

---

## 🌐 Deploy a producción (gratis)

### Opción 1 — Vercel (recomendada)
```bash
npm install -g vercel
npm run build
vercel --prod
# Agrega las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
# en Vercel Dashboard → Settings → Environment Variables
```

### Opción 2 — Netlify
```bash
npm run build
# Arrastra la carpeta dist/ a netlify.com/drop
# O conecta tu repositorio de GitHub
```

---

## 📱 Para convertir en app móvil (Android/iOS)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Changuinola Pro" "com.changuinolapro.app"
npm run build
npx cap add android
npx cap add ios
npx cap sync
npx cap open android   # Necesitas Android Studio
npx cap open ios       # Necesitas Xcode (solo en Mac)
```

---

## 🇵🇦 Hecho para Changuinola, Bocas del Toro, Panamá
