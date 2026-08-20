# OrganizApp

PWA de productividad gamificada con tono sarcástico: Matriz de Eisenhower + sistema de puntos + rachas diarias.

## Requisitos
- Node.js 18 o superior

## Instalación local

```bash
npm install
npm run dev
```

Abre el navegador en la URL que muestre la terminal (normalmente `http://localhost:5173`).

## Build de producción

```bash
npm run build
npm run preview
```

## Despliegue en Vercel (gratis, 3 pasos)

1. **Sube el proyecto a GitHub**
   ```bash
   git init
   git add .
   git commit -m "OrganizApp inicial"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/organizapp.git
   git push -u origin main
   ```
   (Crea antes el repositorio vacío en https://github.com/new)

2. **Conecta con Vercel**
   Entra a [vercel.com](https://vercel.com), inicia sesión con GitHub (gratis), click en
   **"Add New Project"** y selecciona el repositorio `organizapp`.

3. **Deploy**
   Vercel detecta automáticamente que es un proyecto Vite (`npm run build`, output `dist`).
   Dale a **"Deploy"** y en menos de un minuto tendrás tu app pública en
   `https://organizapp.vercel.app` (o el subdominio que elijas), con HTTPS y
   redeploy automático en cada `git push`.

## Notas técnicas
- Persistencia local: `localStorage` (clave `organizapp_data_v2`).
- Notificaciones: usa la API nativa `Notification.requestPermission()` del navegador.
  Requiere HTTPS (Vercel lo da por defecto) — en local con `http://localhost` también funciona.
- Estructura: un único componente principal (`src/OrganizApp.jsx`) con subcomponentes
  internos (`TaskCard`, `ReminderCard`, `Modal`, `SapoAvatar`, `CoachToast`, etc).

## Sincronización entre dispositivos (opcional)

OrganizApp puede sincronizar datos entre dispositivos (y entre distintas personas, cada una
con su propia cuenta) usando [Supabase](https://supabase.com), que tiene un plan gratuito
más que suficiente para esto. Sin configurarlo, la app funciona exactamente igual, pero cada
dispositivo guarda sus datos por separado (en `localStorage`, sin conexión entre ellos).

El modelo es simple: cada persona crea una cuenta con **correo y contraseña**. Al iniciar
sesión con esa misma cuenta en cualquier dispositivo, sus datos se sincronizan solos.
Nada de códigos que copiar y pegar — perfecto para compartir la app con amigos, ya que
cada quien tiene su propia cuenta y sus propios datos, completamente separados.

### 1. Crear el proyecto en Supabase
1. Entra a [supabase.com](https://supabase.com), crea una cuenta gratis y un nuevo proyecto.
2. Ve a **Project Settings → API** y copia:
   - **Project URL** → esta es tu `VITE_SUPABASE_URL`
   - **anon public key** → esta es tu `VITE_SUPABASE_ANON_KEY`

### 2. Crear la tabla (protegida por usuario, dividida por secciones)

> Si ya tenías la tabla `organizapp_sync` de una versión anterior (código compartido, o una
> sola fila por usuario), bórrala primero con `drop table organizapp_sync;` antes de crear
> la nueva — la estructura cambió y no es compatible con las versiones previas. Esto borra
> los datos que tuvieras en la nube (tus dispositivos los vuelven a subir solos en cuanto
> abras la app con la cuenta ya logueada).

Ahora cada "sección" de la app (tareas, recordatorios, notas, categorías, progreso/rachas,
configuración) se guarda en su propia fila, para que editar una sección en un dispositivo
nunca sobreescriba lo que otro dispositivo esté guardando en otra sección al mismo tiempo.

En el proyecto de Supabase, ve a **SQL Editor** y ejecuta:

```sql
create table organizapp_sync (
  user_id uuid not null references auth.users(id) on delete cascade,
  seccion text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, seccion)
);

alter table organizapp_sync enable row level security;

create policy "cada quien ve solo sus datos"
on organizapp_sync for select
using (auth.uid() = user_id);

create policy "cada quien inserta solo sus datos"
on organizapp_sync for insert
with check (auth.uid() = user_id);

create policy "cada quien actualiza solo sus datos"
on organizapp_sync for update
using (auth.uid() = user_id);

create policy "cada quien borra solo sus datos"
on organizapp_sync for delete
using (auth.uid() = user_id);

-- Habilita las actualizaciones en tiempo real para esta tabla
alter publication supabase_realtime add table organizapp_sync;
```

Con estas políticas, cada fila solo es visible para el usuario dueño de esos datos
(`auth.uid()` lo resuelve Supabase automáticamente a partir de la sesión); nadie puede
ver ni tocar los datos de otra persona aunque comparta el mismo despliegue de la app.

### 3. (Recomendado) desactivar la confirmación por correo
Por defecto, Supabase envía un correo de confirmación al crear la cuenta y no deja iniciar
sesión hasta que se confirme. Para que crear cuenta sea instantáneo (sin salir de la app):
ve a **Authentication → Providers → Email** y desactiva **"Confirm email"**.
Si lo dejas activado, la app le avisa a la persona que debe revisar su correo antes de
poder iniciar sesión — sigue funcionando, solo con un paso extra.

### 4. Configurar las variables de entorno

**En local:** copia `.env.example` a `.env` y coloca tus valores reales.

```bash
cp .env.example .env
```

**En Vercel:** ve a tu proyecto → **Settings → Environment Variables** y agrega:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Luego vuelve a desplegar (`git push` o "Redeploy" desde el dashboard de Vercel) para que
tome las nuevas variables — Vite las incrusta en el build, no se leen en tiempo real.

### 5. (Necesario para el botón "Eliminar cuenta") crear la función de borrado

La app tiene un botón en Configuración para que cada persona pueda borrar su propia cuenta
permanentemente. Por seguridad, Supabase no permite borrar una cuenta directamente desde el
navegador (eso requeriría exponer una clave con privilegios de administrador, algo que nunca
debe estar en el código del frontend). En su lugar, se crea una función de Postgres que
**solo puede borrar la cuenta de quien la ejecuta** (nunca cuentas ajenas), y la app la llama
de forma segura.

En el **SQL Editor** de Supabase, ejecuta:

```sql
create or replace function eliminar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function eliminar_mi_cuenta() to authenticated;
```

Al borrar el usuario de `auth.users`, la fila de `organizapp_sync` de esa persona se borra
sola gracias al `on delete cascade` que ya quedó definido en la tabla. Si no creas esta
función, el botón de eliminar cuenta va a mostrar un error indicando que la función no existe.

### 6. Usar la sincronización
1. Abre la app → **Configuración → Sincronización entre dispositivos**.
2. Crea una cuenta con correo y contraseña (o inicia sesión si ya la tienes).
3. Repite el inicio de sesión con la misma cuenta en cualquier otro dispositivo.

Desde ese momento, los cambios en un dispositivo se reflejan en el otro automáticamente
(mientras ambos tengan internet). Si editas en los dos al mismo tiempo sin conexión,
gana la última escritura que llegue al servidor — no hay fusión inteligente de conflictos.
Cada amigo con quien compartas la app simplemente crea su propia cuenta; sus datos nunca
se mezclan con los tuyos.

