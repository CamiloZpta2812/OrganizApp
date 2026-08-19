import { createClient } from '@supabase/supabase-js';

// Estas dos variables se configuran en un archivo .env (local) y en las variables
// de entorno del proyecto en Vercel. Ver README.md para instrucciones completas.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const syncDisponible = Boolean(supabase);

const TABLA = 'organizapp_sync';

/* ============================================================
   AUTENTICACIÓN (correo + contraseña)
   ============================================================ */

export async function crearCuenta(email, password) {
  if (!supabase) return { ok: false, error: 'Sincronización no disponible' };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  // Si el proyecto de Supabase tiene "Confirm email" activado, session vendrá null
  // hasta que la persona confirme el correo.
  return { ok: true, session: data.session, requiereConfirmacion: !data.session };
}

export async function iniciarSesion(email, password) {
  if (!supabase) return { ok: false, error: 'Sincronización no disponible' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data.session };
}

export async function cerrarSesion() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function obtenerSesionActual() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Se dispara con cada cambio de sesión (login, logout, refresh de token, etc.)
export function suscribirseASesion(callback) {
  if (!supabase) return () => {};
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => listener.subscription.unsubscribe();
}

/* ============================================================
   DATOS (una fila por usuario, protegida por Row Level Security)
   ============================================================ */

export async function subirEstado(data) {
  if (!supabase) return { ok: false, error: 'Sincronización no disponible' };
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { ok: false, error: 'No has iniciado sesión' };
  const { error } = await supabase
    .from(TABLA)
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function descargarEstado() {
  if (!supabase) return { ok: false, error: 'Sincronización no disponible' };
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { ok: false, error: 'No has iniciado sesión' };
  const { data, error } = await supabase
    .from(TABLA)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, data: null, updatedAt: null }; // cuenta nueva, aún sin datos guardados
  return { ok: true, data: data.data, updatedAt: data.updated_at };
}

// Escucha cambios en vivo de los datos del usuario autenticado
export function suscribirseACambios(onCambio) {
  if (!supabase) return () => {};
  let canal = null;
  let cancelado = false;
  (async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId || cancelado) return;
    canal = supabase
      .channel(`sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLA, filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.new && payload.new.data) {
            onCambio(payload.new.data, payload.new.updated_at);
          }
        }
      )
      .subscribe();
  })();
  return () => {
    cancelado = true;
    if (canal) supabase.removeChannel(canal);
  };
}
