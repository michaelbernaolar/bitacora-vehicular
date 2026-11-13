// Cuentas de usuario y sincronización con Supabase.
// La app sigue trabajando con la copia local; si hay sesión, esa copia se guarda en la nube
// (una fila por usuario en la tabla `bitacoras`). Gana la versión modificada más recientemente.

import * as S from './store.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

let cliente = null;
let usuario = null;
let estado = 'local'; // local | sincronizando | sincronizado | pendiente | sin-conexion | error
const oyentes = new Set();

export const configurado = () => Boolean((SUPABASE_URL && SUPABASE_KEY) || window.__crearClienteMock);
export const info = () => ({ configurado: configurado(), usuario, estado });
export const alCambiarEstado = (fn) => oyentes.add(fn);

function setEstado(e) {
  estado = e;
  oyentes.forEach((fn) => fn(estado));
}

async function obtenerCreador() {
  if (window.__crearClienteMock) return window.__crearClienteMock;
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/supabase.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar el módulo de cuentas.'));
      document.head.appendChild(s);
    });
  }
  return (url, key, opciones) => window.supabase.createClient(url, key, opciones);
}

/**
 * Arranca las cuentas. `alRefrescar` se llama cuando llegan datos nuevos desde la nube;
 * `alRecuperar` cuando el usuario abre el enlace de "olvidé mi contraseña".
 */
export async function iniciar({ alRefrescar, alRecuperar } = {}) {
  if (!configurado()) return;
  try {
    const crear = await obtenerCreador();
    cliente = crear(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'bitacora.sesion' },
    });
  } catch {
    setEstado('error');
    return;
  }

  cliente.auth.onAuthStateChange((evento, sesion) => {
    const u = sesion?.user || null;
    if (evento === 'PASSWORD_RECOVERY') setTimeout(() => alRecuperar?.(), 0);
    if (!u) {
      const habia = Boolean(usuario);
      usuario = null;
      setEstado('local');
      if (habia) setTimeout(() => alRefrescar?.(), 0);
      return;
    }
    const nuevo = u.id !== usuario?.id;
    usuario = u;
    // Supabase recomienda no esperar otras llamadas dentro de este callback.
    // Al cambiar de usuario se vuelve a dibujar siempre, para mostrar la barra de cuenta.
    if (nuevo) setTimeout(() => sincronizar().then(() => alRefrescar?.()), 0);
  });

  S.alCambiar(programarSubida);
  window.addEventListener('online', () => usuario && sincronizar().then((c) => c && alRefrescar?.()));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && usuario) sincronizar().then((c) => c && alRefrescar?.());
  });
}

// ---------- Sincronización ----------

let enCurso = Promise.resolve(false);
/** Devuelve true si la copia local cambió con datos de la nube. */
export function sincronizar() {
  enCurso = enCurso.then(sincronizarAhora, sincronizarAhora);
  return enCurso;
}

async function sincronizarAhora() {
  if (!usuario || !cliente) return false;
  if (!navigator.onLine) {
    setEstado('sin-conexion');
    return false;
  }
  setEstado('sincronizando');
  try {
    const { data, error } = await cliente
      .from('bitacoras')
      .select('datos, actualizado')
      .eq('user_id', usuario.id)
      .maybeSingle();
    if (error) throw error;

    const m = S.meta();
    let cambio = false;

    if (!data) {
      // Cuenta sin datos todavía: sube lo que hay en este dispositivo (si no es de otra cuenta).
      if (m.cuenta && m.cuenta !== usuario.id) {
        S.desvincular();
        cambio = true;
      }
      S.vincularCuenta(usuario.id);
      await subir();
    } else if (m.cuenta !== usuario.id) {
      // Primera vez de esta cuenta en este dispositivo.
      if (!m.cuenta && S.tieneDatos()) {
        S.fusionarConNube(data.datos, usuario.id); // une lo que había sin cuenta con lo de la nube
        await subir();
      } else {
        S.reemplazarDesdeNube(data.datos, data.actualizado, usuario.id);
      }
      cambio = true;
    } else {
      const local = Date.parse(m.actualizado || 0);
      const nube = Date.parse(data.actualizado || 0);
      if (nube > local) {
        S.reemplazarDesdeNube(data.datos, data.actualizado, usuario.id);
        cambio = true;
      } else if (local > nube) {
        await subir();
      }
    }
    clearTimeout(temporizador);
    setEstado('sincronizado');
    return cambio;
  } catch {
    setEstado(navigator.onLine ? 'error' : 'sin-conexion');
    return false;
  }
}

async function subir() {
  const m = S.meta();
  const { error } = await cliente.from('bitacoras').upsert({
    user_id: usuario.id,
    datos: S.datosParaNube(),
    actualizado: m.actualizado || new Date().toISOString(),
  });
  if (error) throw error;
}

let temporizador;
function programarSubida() {
  if (!usuario) return;
  setEstado('pendiente');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => sincronizar(), 1200);
}

// ---------- Cuenta ----------

const urlBase = () => location.origin + location.pathname;

function traducir(e) {
  const m = String(e?.message || '').toLowerCase();
  if (m.includes('invalid login')) return new Error('Correo o contraseña incorrectos.');
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists'))
    return new Error('Ya existe una cuenta con ese correo. Inicia sesión.');
  if (m.includes('not confirmed')) return new Error('Primero confirma tu correo con el enlace que te enviamos.');
  if (m.includes('password') && (m.includes('6') || m.includes('weak') || m.includes('short')))
    return new Error('La contraseña debe tener al menos 6 caracteres.');
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes'))
    return new Error('Demasiados intentos. Espera un minuto y vuelve a intentar.');
  if (m.includes('invalid') && m.includes('email')) return new Error('Revisa que el correo esté bien escrito.');
  if (m.includes('fetch') || m.includes('network')) return new Error('Sin conexión. Revisa tu internet e inténtalo de nuevo.');
  return new Error(e?.message || 'No se pudo completar. Inténtalo de nuevo.');
}

export async function crearCuenta(correo, clave) {
  const { data, error } = await cliente.auth.signUp({ email: correo, password: clave, options: { emailRedirectTo: urlBase() } });
  if (error) throw traducir(error);
  // Si Supabase pide confirmar el correo, todavía no hay sesión.
  return { debeConfirmar: !data.session };
}

export async function entrar(correo, clave) {
  const { error } = await cliente.auth.signInWithPassword({ email: correo, password: clave });
  if (error) throw traducir(error);
}

export async function recuperarClave(correo) {
  const { error } = await cliente.auth.resetPasswordForEmail(correo, { redirectTo: urlBase() });
  if (error) throw traducir(error);
}

export async function cambiarClave(clave) {
  const { error } = await cliente.auth.updateUser({ password: clave });
  if (error) throw traducir(error);
}

export async function salir() {
  await sincronizar();
  if (estado !== 'sincronizado') {
    throw new Error('Tus últimos cambios aún no se guardan en la cuenta. Conéctate a internet antes de cerrar sesión.');
  }
  await cliente.auth.signOut();
  usuario = null;
  S.desvincular();
  setEstado('local');
}
