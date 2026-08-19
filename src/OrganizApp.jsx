import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  CheckCircle2, Circle, Flame, Plus, X, Settings, Trash2, Clock,
  Star, Bell, BellOff, BellRing, ChevronDown, ChevronUp,
  Target, Sparkles, ListChecks, LayoutGrid, Award, ListOrdered,
  CalendarClock, User, TrendingUp,
} from 'lucide-react';

/* ============================================================
   CONSTANTES Y DATOS ESTÁTICOS
   ============================================================ */
const STORAGE_KEY = 'organizapp_data_v2';

const CATEGORIAS = {
  trabajo:  { label: 'Trabajo',  color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  salud:    { label: 'Salud',    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  social:   { label: 'Social',   color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  pareja:   { label: 'Pareja',   color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  personal: { label: 'Personal', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  otro:     { label: 'Otro',     color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
};

const DURACIONES_RAPIDAS = [15, 30, 45, 60, 90, 120];

const NIVEL_BADGE = {
  1: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  2: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  3: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  4: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  5: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const CUADRANTES_INFO = {
  hacer:     { label: 'Prioridad crítica', emoji: '🔥', desc: 'Nivel 5 — no hay excusa que valga', ring: 'border-red-500/40',    glow: 'shadow-red-500/10' },
  programar: { label: 'Alta prioridad',    emoji: '⚡', desc: 'Nivel 4 — pronto, no "luego"',      ring: 'border-orange-500/40', glow: 'shadow-orange-500/10' },
  delegar:   { label: 'Prioridad media',   emoji: '📌', desc: 'Nivel 3 — cuando puedas',           ring: 'border-amber-500/40',  glow: 'shadow-amber-500/10' },
  eliminar:  { label: 'Baja prioridad',    emoji: '💤', desc: 'Nivel 1-2 — algún día, quizás',     ring: 'border-slate-500/40',  glow: 'shadow-slate-500/10' },
};

function getQuadrantByNivel(nivel) {
  if (nivel >= 5) return 'hacer';
  if (nivel === 4) return 'programar';
  if (nivel === 3) return 'delegar';
  return 'eliminar';
}

// Mensajes del "coach" ácido. {nombre} se reemplaza en tiempo real.
const MSG_COMPLETAR = [
  '¡Por fin hiciste algo útil hoy, {nombre}!',
  'Wow, sobreviviste a esta tarea. Que alguien te dé una medalla.',
  'Milagro: una tarea completada sin excusas de por medio.',
  'Tu yo del futuro te lo agradece, {nombre}, aunque no lo merezcas del todo.',
  'Increíble, cumpliste. Guárdalo en tu currículum de "logros inesperados".',
  'Punto para ti, {nombre}. Solo uno, no te emociones.',
  'Mira nada más, resultó que sí sabías hacer cosas.',
  '¿Ves? No era tan difícil como tu procrastinación te hizo creer.',
];

const MSG_ROAST = [
  'Tu procrastinación debería ser deporte olímpico, {nombre}.',
  'El futuro tú te está odiando ahora mismo.',
  'Esa tarea no se va a hacer sola, pero tú tampoco ayudas mucho.',
  'Posponer: tu talento oculto más desarrollado.',
  '"Después lo hago", dijiste ayer también.',
  'A este ritmo tu racha va a durar menos que tus propósitos de enero.',
  'La procrastinación te manda saludos, {nombre}, parece que son íntimos.',
  'Aplazaste otra vez. Impresionante consistencia... en lo malo.',
];

const MSG_RACHA_PERDIDA = [
  'Tu racha murió, {nombre}. Que descanse en paz, duró lo que un propósito de año nuevo.',
  'Racha reiniciada a 0. Como tus ganas de esforzarte, aparentemente.',
  'Se rompió la racha. Un momento de silencio por tu disciplina.',
  'Racha: 0. Motivación: también 0. Vamos, se puede reconstruir.',
  'Perdiste la racha, pero al menos eres consistente... en perderla.',
];

const MSG_META_CUMPLIDA = [
  '¡Meta diaria cumplida! Los milagros sí existen, {nombre}.',
  'Llegaste a la meta. Alguien avise a los periódicos.',
  'Meta del día superada. Tu procrastinación descansa hoy, no te acostumbres.',
  '¡Lo lograste, {nombre}! Guarda esta racha de buen comportamiento, no es común.',
];

// Mensajes diarios de bienvenida de S.A.P.O
const MENSAJES_SAPO = [
  'Buenos días, {nombre}. Aquí S.A.P.O., reportándome para vigilar que hoy no seas un desastre... otra vez.',
  '{nombre}, otro día, otra oportunidad de fingir que tienes todo bajo control.',
  'Alerta S.A.P.O.: se detectaron altos niveles de procrastinación en tu historial reciente, {nombre}. Hoy cambiemos eso, ¿o no?',
  'Hola, {nombre}. Recuerda: el café no hace las tareas por ti, aunque lo intentes con fe ciega.',
  '{nombre}, tu yo de anoche te dejó tareas pendientes. Típico de él.',
  'Buen día, {nombre}. S.A.P.O. reportando: cero excusas nuevas detectadas, así que toca trabajar con las viejas.',
  '{nombre}, el sofá te espera esta noche. Pero antes hay que ganárselo.',
  'S.A.P.O. al habla: hoy decide si eres productivo por convicción o por culpa. Ambas funcionan, {nombre}.',
  'Otro amanecer, {nombre}. Otra racha que puedes romper o mantener. Sin presión (mentira, sí hay presión).',
  '{nombre}, si esto fuera un examen de productividad, ¿lo estarías pasando? Piensa rápido.',
];

// Mensaje fijo de presentación (primera vez que se abre la app)
const MSG_ONBOARDING = '¡Hola! Soy S.A.P.O., Supervisor Autónomo para Procrastinadores Obligados. Alguien tenía que vigilar tu productividad, y adivina a quién le tocó. Bienvenido a OrganizApp: aquí organizamos tus pendientes, contamos tus rachas y, cuando haga falta, te lo restregamos en la cara. Antes de arrancar, dime algo: ¿cómo te llamas?';

// Frases de S.A.P.O para las notificaciones de recordatorios
const MSG_NOTIF_SAPO = [
  (t) => `S.A.P.O. reportando: "${t}" sigue pendiente. No fue una sugerencia.`,
  (t) => `Oye. "${t}". Sí, ahora. No después.`,
  (t) => `Recordatorio de S.A.P.O.: "${t}" no se va a resolver solo, por más que lo ignores.`,
  (t) => `"${t}" — o lo haces ya, o le sigues dando largas. Tú decides, yo solo aviso.`,
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function conNombre(texto, nombre) {
  return texto.replace(/\{nombre\}/g, nombre);
}

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

function addDiasISO(fechaISO, dias) {
  const d = new Date(fechaISO + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

function formatFechaCorta(fechaISO) {
  try {
    return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(
      new Date(fechaISO + 'T00:00:00')
    );
  } catch {
    return fechaISO;
  }
}

function formatDuracion(min) {
  const m = Number(min) || 0;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const resto = m % 60;
  return resto === 0 ? `${h}h` : `${h}h${resto}`;
}

function calcularPuntos(duracionMin, nivel) {
  const d = Number(duracionMin) || 0;
  const n = Number(nivel) || 1;
  return Math.round(d * n);
}

function grupoDeFecha(fechaISO, hoyStr) {
  if (fechaISO < hoyStr) return 'Atrasados';
  if (fechaISO === hoyStr) return 'Hoy';
  if (fechaISO === addDiasISO(hoyStr, 1)) return 'Mañana';
  return 'Próximos';
}

const ORDEN_GRUPOS = ['Atrasados', 'Hoy', 'Mañana', 'Próximos'];

function tipSugerencia(index, total) {
  if (total === 0) return '';
  if (index === 0) return 'Arranca por aquí. Cero calentamiento, cero excusas.';
  if (index === total - 1) return 'La última de la lista. Si llegaste hasta acá, te ganaste algo rico.';
  if (total > 2 && index === Math.floor(total / 2)) return 'Vas a la mitad. No, no puedes rendirte ahora.';
  return 'Sigue con esta. El sofá puede esperar un poco más.';
}

// ¿La fecha es sábado o domingo?
function esFinDeSemana(fechaISO) {
  const dia = new Date(fechaISO + 'T00:00:00').getDay();
  return dia === 0 || dia === 6;
}

// ¿Ese día no debería afectar la racha? (fin de semana según configuración, o festivo manual)
function esDiaLibre(fechaISO, finDeSemanaLibre, festivosManual) {
  if (festivosManual.includes(fechaISO)) return true;
  if (finDeSemanaLibre && esFinDeSemana(fechaISO)) return true;
  return false;
}

function mensajeRacha(racha) {
  if (racha === 0) return 'Cero. Nada. Vacío existencial productivo.';
  if (racha < 3) return 'Apenas arrancando. No cantes victoria todavía.';
  if (racha < 7) return 'Ya casi una semana. Sigue así antes de que se te suba a la cabeza.';
  if (racha < 14) return 'Dos semanas casi. Empiezas a dar miedo, en el buen sentido.';
  if (racha < 30) return '¿Quién eres y qué hiciste con la persona procrastinadora de antes?';
  return 'Racha de leyenda. S.A.P.O. está oficialmente impresionado, y eso casi nunca pasa.';
}

/* ============================================================
   PERSISTENCIA (localStorage)
   ============================================================ */
function cargarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('OrganizApp: no se pudo leer localStorage', e);
    return null;
  }
}

function guardarEstado(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('OrganizApp: no se pudo escribir en localStorage', e);
  }
}

/* ============================================================
   SUBCOMPONENTES
   ============================================================ */

// Avatar original de S.A.P.O: un sapo con gafas de sol, dibujado en SVG
function SapoAvatar({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="60" rx="38" ry="30" fill="#22c55e" />
      <circle cx="30" cy="31" r="15" fill="#22c55e" />
      <circle cx="70" cy="31" r="15" fill="#22c55e" />
      <circle cx="30" cy="31" r="8.5" fill="#f0fdf4" />
      <circle cx="70" cy="31" r="8.5" fill="#f0fdf4" />
      <rect x="12" y="26" width="34" height="14" rx="7" fill="#0f172a" />
      <rect x="54" y="26" width="34" height="14" rx="7" fill="#0f172a" />
      <rect x="44" y="30" width="12" height="4" fill="#0f172a" />
      <circle cx="23" cy="31" r="2.4" fill="#e2e8f0" opacity="0.7" />
      <circle cx="65" cy="31" r="2.4" fill="#e2e8f0" opacity="0.7" />
      <circle cx="43" cy="57" r="2.2" fill="#065f46" />
      <circle cx="57" cy="57" r="2.2" fill="#065f46" />
      <path d="M35 68 Q50 78 65 66" stroke="#065f46" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="68" r="4.2" fill="#16a34a" opacity="0.6" />
      <circle cx="78" cy="64" r="5.2" fill="#16a34a" opacity="0.6" />
      <circle cx="50" cy="82" r="3" fill="#16a34a" opacity="0.5" />
    </svg>
  );
}

// Ventana flotante de S.A.P.O: sube desde abajo, para saludos diarios y onboarding
function SapoSheet({ mode, message, nombre, onNombreChange, onPrimary, onClose }) {
  const puedeCerrar = mode !== 'onboarding';
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={puedeCerrar ? onClose : undefined}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-t sm:border border-emerald-500/20 rounded-t-3xl sm:rounded-3xl p-5 pb-6 shadow-2xl animate-[sapoUp_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]"
      >
        <div className="w-10 h-1.5 rounded-full bg-white/15 mx-auto mb-4" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <SapoAvatar className="w-14 h-14 shrink-0" />
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-bold text-emerald-300 leading-none">S.A.P.O.</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">Supervisor Autónomo para Procrastinadores Obligados</p>
            </div>
          </div>
          {puedeCerrar && (
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-slate-500 shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-sm text-slate-200 leading-relaxed mt-3">{message}</p>

        {mode === 'onboarding' && (
          <input
            autoFocus
            type="text"
            value={nombre}
            onChange={e => onNombreChange(e.target.value)}
            placeholder="Escribe tu nombre aquí..."
            className="w-full mt-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-base outline-none focus:border-emerald-400/60"
          />
        )}

        <button
          onClick={onPrimary}
          className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
        >
          {mode === 'onboarding' ? (nombre.trim() ? `Encantado, ${nombre.trim()}` : 'Continuar') : 'Ya, ya, entendido'}
        </button>
      </div>
    </div>
  );
}

// Toast del "coach" sarcástico (mensajes cortos al completar/posponer tareas)
function CoachToast({ mensaje }) {
  if (!mensaje) return null;
  const estilos = {
    exito: 'from-emerald-500/90 to-teal-500/90 border-emerald-400/50',
    roast: 'from-rose-500/90 to-red-500/90 border-rose-400/50',
    meta:  'from-amber-400/90 to-yellow-500/90 border-amber-300/50',
    racha: 'from-slate-600/90 to-slate-700/90 border-slate-400/50',
  };
  return (
    <div
      key={mensaje.id}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[92%] sm:max-w-md
        px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl
        bg-gradient-to-br ${estilos[mensaje.tipo] || estilos.exito}
        animate-[slideDown_0.35s_ease-out]`}
    >
      <p className="text-white text-sm font-medium text-center leading-snug">
        {mensaje.texto}
      </p>
    </div>
  );
}

// Badge de categoría
function CategoriaBadge({ categoria }) {
  const info = CATEGORIAS[categoria] || CATEGORIAS.otro;
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${info.color}`}>
      {info.label}
    </span>
  );
}

// Tarjeta de una tarea individual
function TaskCard({ tarea, onToggle, onDelete }) {
  const [recienCompletada, setRecienCompletada] = useState(false);

  const handleToggle = () => {
    if (!tarea.completada) {
      setRecienCompletada(true);
      setTimeout(() => setRecienCompletada(false), 700);
    }
    onToggle(tarea.id);
  };

  return (
    <div
      className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-300
        ${tarea.completada
          ? 'bg-white/[0.03] border-white/5 opacity-60'
          : 'bg-white/[0.06] border-white/10 hover:border-white/20 hover:bg-white/[0.09]'}
        ${recienCompletada ? 'scale-[1.02] ring-2 ring-emerald-400/40' : ''}
      `}
    >
      <button
        onClick={handleToggle}
        className="mt-0.5 shrink-0 transition-transform duration-200 active:scale-90"
        aria-label="Marcar tarea completada"
      >
        {tarea.completada
          ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          : <Circle className="w-6 h-6 text-slate-400 group-hover:text-slate-200" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium break-words ${tarea.completada ? 'line-through text-slate-500' : 'text-slate-100'}`}>
          {tarea.titulo}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <CategoriaBadge categoria={tarea.categoria} />
          <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${NIVEL_BADGE[tarea.nivel] || NIVEL_BADGE[3]}`}>
            <Star className="w-3 h-3" /> P{tarea.nivel}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> {formatDuracion(tarea.duracion)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            <Award className="w-3 h-3 text-amber-400" /> {tarea.puntos} pts
          </span>
        </div>
      </div>

      <button
        onClick={() => onDelete(tarea.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400"
        aria-label="Eliminar tarea"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Tarjeta de un recordatorio individual
function ReminderCard({ recordatorio, onToggle, onDelete }) {
  return (
    <div
      className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-300
        ${recordatorio.completado
          ? 'bg-white/[0.03] border-white/5 opacity-60'
          : 'bg-white/[0.06] border-white/10 hover:border-white/20 hover:bg-white/[0.09]'}
      `}
    >
      <button
        onClick={() => onToggle(recordatorio.id)}
        className="mt-0.5 shrink-0 transition-transform duration-200 active:scale-90"
        aria-label="Marcar recordatorio hecho"
      >
        {recordatorio.completado
          ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          : <Circle className="w-6 h-6 text-slate-400 group-hover:text-slate-200" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium break-words ${recordatorio.completado ? 'line-through text-slate-500' : 'text-slate-100'}`}>
          {recordatorio.titulo}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className="flex items-center gap-1 text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
            <CalendarClock className="w-3 h-3" /> {formatFechaCorta(recordatorio.fecha)} · {recordatorio.hora}
          </span>
        </div>
      </div>

      <button
        onClick={() => onDelete(recordatorio.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400"
        aria-label="Eliminar recordatorio"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Modal genérico (centrado en desktop, hoja inferior en móvil)
function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-slate-900/95 border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto shadow-2xl animate-[slideUp_0.3s_ease-out]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{titulo}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function OrganizApp() {
  // --- Carga inicial (una sola vez) ---
  const initRef = useRef(null);
  if (initRef.current === null) {
    initRef.current = cargarEstado() || {};
  }
  const saved = initRef.current;
  const yaTeniaDatos = Boolean(
    saved && ((saved.tareas && saved.tareas.length) || (saved.historial && saved.historial.length) || saved.nombre || saved.racha)
  );

  // --- Estado de datos ---
  const [tareas, setTareas] = useState(saved.tareas || []);
  const [recordatorios, setRecordatorios] = useState(saved.recordatorios || []);
  const [historial, setHistorial] = useState(saved.historial || []);
  const [racha, setRacha] = useState(saved.racha || 0);
  const [mejorRacha, setMejorRacha] = useState(saved.mejorRacha ?? saved.racha ?? 0);
  const [metaPorcentaje, setMetaPorcentaje] = useState(saved.metaPorcentaje ?? 70);
  const [lastActiveDate, setLastActiveDate] = useState(saved.lastActiveDate || hoyISO());
  const [nombre, setNombre] = useState(saved.nombre || '');
  const [lastGreetingDate, setLastGreetingDate] = useState(saved.lastGreetingDate || '');
  const [onboardingCompleto, setOnboardingCompleto] = useState(saved.onboardingCompleto ?? yaTeniaDatos);
  const [finDeSemanaLibre, setFinDeSemanaLibre] = useState(saved.finDeSemanaLibre ?? true);
  const [festivosManual, setFestivosManual] = useState(saved.festivosManual || []);

  const [notifPermiso, setNotifPermiso] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  // --- Estado de UI ---
  const [activeTab, setActiveTab] = useState('tareas'); // 'tareas' | 'recordatorios'
  const [vistaLista, setVistaLista] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddRecordatorio, setShowAddRecordatorio] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSugerencia, setShowSugerencia] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showRachaInfo, setShowRachaInfo] = useState(false);
  const [sapoMode, setSapoMode] = useState('greeting'); // 'greeting' | 'onboarding'
  const [greetingMsg, setGreetingMsg] = useState('');
  const [coachMsg, setCoachMsg] = useState(null);
  const [nuevoFestivo, setNuevoFestivo] = useState('');
  const [cuadrantesAbiertos, setCuadrantesAbiertos] = useState({
    hacer: true, programar: true, delegar: true, eliminar: true,
  });

  const [form, setForm] = useState({
    titulo: '', categoria: 'trabajo', duracion: 30, nivel: 3,
  });

  const [formRecordatorio, setFormRecordatorio] = useState({
    titulo: '', fecha: hoyISO(), hora: '',
  });

  const nombreMostrado = nombre.trim() || 'Humano';

  // --- Mostrar mensaje del coach con auto-dismiss ---
  const mostrarCoach = useCallback((texto, tipo) => {
    setCoachMsg({ texto: conNombre(texto, nombreMostrado), tipo, id: Date.now() + Math.random() });
  }, [nombreMostrado]);

  useEffect(() => {
    if (!coachMsg) return;
    const t = setTimeout(() => setCoachMsg(null), 4200);
    return () => clearTimeout(t);
  }, [coachMsg]);

  /* --------------------------------------------------------
     S.A.P.O: saludo diario y onboarding inicial
     -------------------------------------------------------- */
  const lanzarSaludoSiCorresponde = useCallback((forzar = false) => {
    const hoyStr = hoyISO();
    if (forzar || lastGreetingDate !== hoyStr) {
      setSapoMode('greeting');
      setGreetingMsg(conNombre(pickRandom(MENSAJES_SAPO), nombreMostrado));
      setShowGreeting(true);
      if (!forzar) setLastGreetingDate(hoyStr);
    }
  }, [lastGreetingDate, nombreMostrado]);

  const completarOnboarding = () => {
    setOnboardingCompleto(true);
    setLastGreetingDate(hoyISO());
    setShowGreeting(false);
  };

  useEffect(() => {
    if (!onboardingCompleto) {
      setSapoMode('onboarding');
      setGreetingMsg(MSG_ONBOARDING);
      setShowGreeting(true);
    } else {
      lanzarSaludoSiCorresponde(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------------
     CIERRE DE DÍA: evalúa racha (salvo días libres) y archiva tareas
     -------------------------------------------------------- */
  const procesarCierreDia = useCallback((fechaAnterior, fechaNueva) => {
    const libre = esDiaLibre(fechaAnterior, finDeSemanaLibre, festivosManual);

    setTareas(prevTareas => {
      const tareasDeAyer = prevTareas.filter(t => t.fecha === fechaAnterior);
      const totalAyer = tareasDeAyer.reduce((s, t) => s + t.puntos, 0);
      const completadoAyer = tareasDeAyer.filter(t => t.completada).reduce((s, t) => s + t.puntos, 0);
      const metaAyer = totalAyer * metaPorcentaje / 100;
      const huboTareas = totalAyer > 0;
      const cumplida = huboTareas && completadoAyer >= metaAyer;

      if (huboTareas) {
        setHistorial(prevHist => [
          ...prevHist,
          { fecha: fechaAnterior, puntosObtenidos: completadoAyer, puntosMeta: Math.round(metaAyer), cumplida, libre },
        ].slice(-90));

        if (!libre) {
          setRacha(prevRacha => {
            if (cumplida) {
              const nueva = prevRacha + 1;
              setMejorRacha(prevMejor => Math.max(prevMejor, nueva));
              return nueva;
            }
            mostrarCoach(pickRandom(MSG_RACHA_PERDIDA), 'racha');
            return 0;
          });
        }
      }

      return prevTareas.filter(t => t.fecha !== fechaAnterior);
    });

    setLastActiveDate(fechaNueva);
  }, [metaPorcentaje, mostrarCoach, finDeSemanaLibre, festivosManual]);

  // Revisa si cambió el día (cada minuto): cierre de día + saludo nuevo
  useEffect(() => {
    const check = () => {
      const hoyStr = hoyISO();
      if (hoyStr !== lastActiveDate) {
        procesarCierreDia(lastActiveDate, hoyStr);
      }
      if (onboardingCompleto && hoyStr !== lastGreetingDate) {
        lanzarSaludoSiCorresponde(false);
      }
    };
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [lastActiveDate, lastGreetingDate, onboardingCompleto, procesarCierreDia, lanzarSaludoSiCorresponde]);

  /* --------------------------------------------------------
     NOTIFICACIONES DE S.A.P.O: revisa recordatorios cada 30s
     -------------------------------------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      if (notifPermiso !== 'granted') return;
      const ahora = new Date();
      const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
      const hoyStr = hoyISO();

      setRecordatorios(prev => {
        let huboMatch = false;
        const actualizados = prev.map(r => {
          if (r.fecha === hoyStr && r.hora === hhmm && !r.notificado && !r.completado) {
            huboMatch = true;
            try {
              new Notification('🐸 S.A.P.O. te recuerda', {
                body: pickRandom(MSG_NOTIF_SAPO)(r.titulo),
              });
            } catch (e) { /* noop */ }
            return { ...r, notificado: true };
          }
          return r;
        });
        return huboMatch ? actualizados : prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [notifPermiso]);

  /* --------------------------------------------------------
     PERSISTIR EN LOCALSTORAGE
     -------------------------------------------------------- */
  useEffect(() => {
    guardarEstado({
      tareas, recordatorios, historial, racha, mejorRacha, metaPorcentaje,
      lastActiveDate, nombre, lastGreetingDate, onboardingCompleto,
      finDeSemanaLibre, festivosManual,
    });
  }, [tareas, recordatorios, historial, racha, mejorRacha, metaPorcentaje, lastActiveDate,
      nombre, lastGreetingDate, onboardingCompleto, finDeSemanaLibre, festivosManual]);

  /* --------------------------------------------------------
     ACCIONES: notificaciones, tareas, recordatorios, festivos
     -------------------------------------------------------- */
  const solicitarPermisoNotif = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setNotifPermiso(p);
  };

  const agregarTarea = () => {
    if (!form.titulo.trim()) return;
    const nueva = {
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      titulo: form.titulo.trim(),
      categoria: form.categoria,
      duracion: Number(form.duracion) || 0,
      nivel: Number(form.nivel),
      puntos: calcularPuntos(form.duracion, form.nivel),
      fecha: hoyISO(),
      completada: false,
    };
    setTareas(prev => [...prev, nueva]);
    setForm({ titulo: '', categoria: 'trabajo', duracion: 30, nivel: 3 });
    setShowAddModal(false);
  };

  const toggleCompletar = (id) => {
    const tarea = tareas.find(t => t.id === id);
    if (!tarea) return;
    const seCompleta = !tarea.completada;
    const nuevasTareas = tareas.map(t => t.id === id ? { ...t, completada: seCompleta } : t);
    setTareas(nuevasTareas);

    if (seCompleta) {
      mostrarCoach(pickRandom(MSG_COMPLETAR), 'exito');

      const hoyStr = hoyISO();
      const tareasHoyList = nuevasTareas.filter(t => t.fecha === hoyStr);
      const totalHoy = tareasHoyList.reduce((s, t) => s + t.puntos, 0);
      const completadoHoyPts = tareasHoyList.filter(t => t.completada).reduce((s, t) => s + t.puntos, 0);
      const metaHoy = totalHoy * metaPorcentaje / 100;
      const completadoAntes = completadoHoyPts - tarea.puntos;

      if (metaHoy > 0 && completadoAntes < metaHoy && completadoHoyPts >= metaHoy) {
        setTimeout(() => mostrarCoach(pickRandom(MSG_META_CUMPLIDA), 'meta'), 1500);
      }
    } else {
      mostrarCoach(pickRandom(MSG_ROAST), 'roast');
    }
  };

  const eliminarTarea = (id) => {
    setTareas(prev => prev.filter(t => t.id !== id));
  };

  const agregarRecordatorio = () => {
    if (!formRecordatorio.titulo.trim()) return;
    const nuevo = {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      titulo: formRecordatorio.titulo.trim(),
      fecha: formRecordatorio.fecha || hoyISO(),
      hora: formRecordatorio.hora || '08:00',
      completado: false,
      notificado: false,
    };
    setRecordatorios(prev => [...prev, nuevo]);
    setFormRecordatorio({ titulo: '', fecha: hoyISO(), hora: '' });
    setShowAddRecordatorio(false);
  };

  const toggleRecordatorio = (id) => {
    setRecordatorios(prev => prev.map(r => r.id === id ? { ...r, completado: !r.completado } : r));
  };

  const eliminarRecordatorio = (id) => {
    setRecordatorios(prev => prev.filter(r => r.id !== id));
  };

  const agregarFestivo = () => {
    if (!nuevoFestivo) return;
    setFestivosManual(prev => prev.includes(nuevoFestivo) ? prev : [...prev, nuevoFestivo].sort());
    setNuevoFestivo('');
  };

  const quitarFestivo = (fecha) => {
    setFestivosManual(prev => prev.filter(f => f !== fecha));
  };

  const resetearDatos = () => {
    if (!window.confirm('¿Seguro? Esto borra tareas, recordatorios, racha e historial. No hay vuelta atrás.')) return;
    setTareas([]);
    setRecordatorios([]);
    setHistorial([]);
    setRacha(0);
    setMejorRacha(0);
    setLastActiveDate(hoyISO());
    setShowSettings(false);
  };

  /* --------------------------------------------------------
     DATOS DERIVADOS: tareas
     -------------------------------------------------------- */
  const hoy = hoyISO();
  const tareasHoy = useMemo(() => tareas.filter(t => t.fecha === hoy), [tareas, hoy]);
  const totalPuntosHoy = useMemo(() => tareasHoy.reduce((s, t) => s + t.puntos, 0), [tareasHoy]);
  const completadoHoy = useMemo(() => tareasHoy.filter(t => t.completada).reduce((s, t) => s + t.puntos, 0), [tareasHoy]);
  const metaPuntosHoy = Math.round(totalPuntosHoy * metaPorcentaje / 100);
  const progresoPct = metaPuntosHoy > 0 ? Math.min(100, Math.round((completadoHoy / metaPuntosHoy) * 100)) : 0;

  const tareasPorCuadrante = useMemo(() => {
    const grupos = { hacer: [], programar: [], delegar: [], eliminar: [] };
    tareasHoy.forEach(t => {
      grupos[getQuadrantByNivel(t.nivel)].push(t);
    });
    return grupos;
  }, [tareasHoy]);

  const toggleCuadrante = (q) => setCuadrantesAbiertos(prev => ({ ...prev, [q]: !prev[q] }));

  const ordenSugerido = useMemo(() => {
    const pendientes = tareasHoy.filter(t => !t.completada);
    return [...pendientes].sort((a, b) => {
      const scoreA = a.nivel * 100 - a.duracion;
      const scoreB = b.nivel * 100 - b.duracion;
      return scoreB - scoreA;
    });
  }, [tareasHoy]);

  /* --------------------------------------------------------
     DATOS DERIVADOS: recordatorios
     -------------------------------------------------------- */
  const recordatoriosPendientes = useMemo(
    () => recordatorios.filter(r => !r.completado).length,
    [recordatorios]
  );

  const recordatoriosPorGrupo = useMemo(() => {
    const ordenados = [...recordatorios].sort((a, b) => {
      const fa = `${a.fecha} ${a.hora}`;
      const fb = `${b.fecha} ${b.hora}`;
      return fa.localeCompare(fb);
    });
    const grupos = { Atrasados: [], Hoy: [], Mañana: [], Próximos: [] };
    ordenados.forEach(r => {
      grupos[grupoDeFecha(r.fecha, hoy)].push(r);
    });
    return grupos;
  }, [recordatorios, hoy]);

  /* --------------------------------------------------------
     DATOS DERIVADOS: estadísticas de racha
     -------------------------------------------------------- */
  const diasNoLibres = useMemo(() => historial.filter(h => !h.libre), [historial]);
  const porcentajeCumplimiento = diasNoLibres.length > 0
    ? Math.round((diasNoLibres.filter(h => h.cumplida).length / diasNoLibres.length) * 100)
    : 0;
  const diaMasProductivo = useMemo(() => {
    if (historial.length === 0) return null;
    return historial.reduce((max, h) => (!max || h.puntosObtenidos > max.puntosObtenidos) ? h : max, null);
  }, [historial]);

  /* --------------------------------------------------------
     RENDER
     -------------------------------------------------------- */
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <style>{`
        @keyframes slideDown { from { opacity:0; transform: translate(-50%, -12px);} to { opacity:1; transform: translate(-50%, 0);} }
        @keyframes slideUp { from { opacity:0; transform: translateY(24px);} to { opacity:1; transform: translateY(0);} }
        @keyframes popIn { from { opacity:0; transform: translateY(8px) scale(0.9);} to { opacity:1; transform: translateY(0) scale(1);} }
        @keyframes sapoUp { from { opacity:0; transform: translateY(100%);} to { opacity:1; transform: translateY(0);} }
      `}</style>

      <CoachToast mensaje={coachMsg} />

      {/* HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-slate-950/70 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => lanzarSaludoSiCorresponde(true)}
            className="flex items-center gap-2 text-left"
            aria-label="Escuchar a S.A.P.O"
          >
            <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">OrganizApp</h1>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">Hola, {nombreMostrado}</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRachaInfo(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold transition active:scale-95
                ${racha > 0 ? 'bg-orange-500/15 border-orange-500/30 text-orange-300 hover:bg-orange-500/25' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
              aria-label="Ver detalles de tu racha"
            >
              <Flame className={`w-4 h-4 ${racha > 0 ? 'text-orange-400' : 'text-slate-500'}`} />
              {racha}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-white/10 text-slate-300"
              aria-label="Configuración"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-28 pt-4">

        {/* TABS PRINCIPALES */}
        <div className="flex items-center gap-1 mb-4 bg-white/[0.03] p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('tareas')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition
              ${activeTab === 'tareas' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ListChecks className="w-4 h-4" /> Tareas
          </button>
          <button
            onClick={() => setActiveTab('recordatorios')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition relative
              ${activeTab === 'recordatorios' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <BellRing className="w-4 h-4" /> Recordatorios
            {recordatoriosPendientes > 0 && (
              <span className="absolute -top-1 right-3 min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                {recordatoriosPendientes}
              </span>
            )}
          </button>
        </div>

        {/* --------------------- VISTA: TAREAS --------------------- */}
        {activeTab === 'tareas' && (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                  <Target className="w-4 h-4 text-emerald-400" /> Meta de hoy ({metaPorcentaje}%)
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  {completadoHoy} / {metaPuntosHoy} pts
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out
                    ${progresoPct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-indigo-400 to-purple-400'}`}
                  style={{ width: `${progresoPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {totalPuntosHoy === 0
                  ? 'No tienes tareas hoy. Cero tareas, cero excusas, cero puntos.'
                  : progresoPct >= 100
                    ? '¡Meta superada! Ve a celebrar (con moderación).'
                    : `Te faltan ${Math.max(metaPuntosHoy - completadoHoy, 0)} pts. El sofá puede esperar.`}
              </p>
            </section>

            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVistaLista(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition
                    ${!vistaLista ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <LayoutGrid className="w-4 h-4" /> Tablero
                </button>
                <button
                  onClick={() => setVistaLista(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition
                    ${vistaLista ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <ListChecks className="w-4 h-4" /> Lista
                </button>
              </div>
              <button
                onClick={() => setShowSugerencia(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 transition"
              >
                <ListOrdered className="w-4 h-4" /> Orden
              </button>
            </div>

            {!vistaLista && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(CUADRANTES_INFO).map(q => {
                  const info = CUADRANTES_INFO[q];
                  const lista = tareasPorCuadrante[q];
                  const abierto = cuadrantesAbiertos[q];
                  return (
                    <div key={q} className={`rounded-2xl border ${info.ring} bg-white/[0.03] shadow-lg ${info.glow} overflow-hidden`}>
                      <button
                        onClick={() => toggleCuadrante(q)}
                        className="w-full flex items-center justify-between p-3.5"
                      >
                        <div className="text-left">
                          <p className="font-semibold text-sm">{info.emoji} {info.label} <span className="text-slate-500 font-normal">({lista.length})</span></p>
                          <p className="text-[11px] text-slate-500">{info.desc}</p>
                        </div>
                        {abierto ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {abierto && (
                        <div className="px-3 pb-3 space-y-2">
                          {lista.length === 0 && (
                            <p className="text-xs text-slate-600 italic px-1 pb-1">Vacío. Sospechosamente vacío.</p>
                          )}
                          {lista.map(t => (
                            <TaskCard key={t.id} tarea={t} onToggle={toggleCompletar} onDelete={eliminarTarea} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {vistaLista && (
              <div className="space-y-2">
                {tareasHoy.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-10">
                    No hay tareas hoy. Aprovecha para inventar una excusa nueva.
                  </p>
                )}
                {tareasHoy
                  .slice()
                  .sort((a, b) => (a.completada === b.completada ? 0 : a.completada ? 1 : -1))
                  .map(t => (
                    <TaskCard key={t.id} tarea={t} onToggle={toggleCompletar} onDelete={eliminarTarea} />
                  ))}
              </div>
            )}
          </>
        )}

        {/* --------------------- VISTA: RECORDATORIOS --------------------- */}
        {activeTab === 'recordatorios' && (
          <div className="space-y-5">
            {recordatorios.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-10">
                No hay recordatorios. Tu memoria está sola en esto, por ahora.
              </p>
            )}
            {ORDEN_GRUPOS.map(grupo => {
              const lista = recordatoriosPorGrupo[grupo];
              if (!lista || lista.length === 0) return null;
              return (
                <div key={grupo}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${grupo === 'Atrasados' ? 'text-red-400' : 'text-slate-500'}`}>
                    {grupo}
                  </p>
                  <div className="space-y-2">
                    {lista.map(r => (
                      <ReminderCard key={r.id} recordatorio={r} onToggle={toggleRecordatorio} onDelete={eliminarRecordatorio} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB CON MENÚ DESPLEGABLE */}
      {showFabMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowFabMenu(false)} />
      )}
      <div className="fixed bottom-6 right-5 z-30 flex flex-col items-end gap-3">
        {showFabMenu && (
          <>
            <button
              onClick={() => { setShowAddRecordatorio(true); setShowFabMenu(false); }}
              className="flex items-center gap-2 pl-4 pr-3.5 py-2.5 rounded-full bg-slate-800 border border-white/10 shadow-lg text-sm font-medium text-slate-100 animate-[popIn_0.2s_ease-out_both]"
            >
              Recordatorio <BellRing className="w-4 h-4 text-indigo-300" />
            </button>
            <button
              onClick={() => { setShowAddModal(true); setShowFabMenu(false); }}
              style={{ animationDelay: '40ms' }}
              className="flex items-center gap-2 pl-4 pr-3.5 py-2.5 rounded-full bg-slate-800 border border-white/10 shadow-lg text-sm font-medium text-slate-100 animate-[popIn_0.2s_ease-out_both]"
            >
              Tarea <ListChecks className="w-4 h-4 text-emerald-300" />
            </button>
          </>
        )}
        <button
          onClick={() => setShowFabMenu(v => !v)}
          className={`w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
            shadow-xl shadow-purple-900/40 flex items-center justify-center active:scale-90 transition-transform duration-200
            ${showFabMenu ? 'rotate-45' : ''}`}
          aria-label="Agregar"
        >
          <Plus className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* MODAL AGREGAR TAREA */}
      {showAddModal && (
        <Modal titulo="Nueva tarea" onClose={() => setShowAddModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Título</label>
              <input
                type="text"
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder="¿Qué toca hacer, aunque no quieras?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-base outline-none focus:border-indigo-400/60"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Categoría</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(CATEGORIAS).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, categoria: key })}
                    className={`text-xs px-2.5 py-1 rounded-full border transition
                      ${form.categoria === key ? info.color + ' ring-1 ring-white/30' : 'bg-white/5 text-slate-400 border-white/10'}`}
                  >
                    {info.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Duración aproximada</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DURACIONES_RAPIDAS.map(min => (
                  <button
                    key={min}
                    onClick={() => setForm({ ...form, duracion: min })}
                    className={`text-xs px-3 py-1.5 rounded-full border transition
                      ${Number(form.duracion) === min ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-200' : 'bg-white/5 border-white/10 text-slate-400'}`}
                  >
                    {formatDuracion(min)}
                  </button>
                ))}
              </div>
              <input
                type="number" min="1"
                value={form.duracion}
                onChange={e => setForm({ ...form, duracion: e.target.value })}
                placeholder="o escribe los minutos exactos"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-base outline-none focus:border-indigo-400/60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">Importancia</label>
                <span className="text-xs text-slate-400">{form.nivel} / 5</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setForm({ ...form, nivel: n })}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition"
                    aria-label={`Importancia ${n}`}
                  >
                    <Star
                      className={`w-7 h-7 transition ${n <= form.nivel ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-1 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400">Puntos estimados</span>
              <span className="text-sm font-bold text-amber-300 flex items-center gap-1">
                <Star className="w-3.5 h-3.5" /> {calcularPuntos(form.duracion, form.nivel)}
              </span>
            </div>

            <button
              onClick={agregarTarea}
              disabled={!form.titulo.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm
                disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              Agregar tarea
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL AGREGAR RECORDATORIO */}
      {showAddRecordatorio && (
        <Modal titulo="Nuevo recordatorio" onClose={() => setShowAddRecordatorio(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Título</label>
              <input
                type="text"
                value={formRecordatorio.titulo}
                onChange={e => setFormRecordatorio({ ...formRecordatorio, titulo: e.target.value })}
                placeholder="¿Qué no puedes olvidar?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-base outline-none focus:border-indigo-400/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Fecha</label>
                <input
                  type="date"
                  value={formRecordatorio.fecha}
                  onChange={e => setFormRecordatorio({ ...formRecordatorio, fecha: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-base outline-none focus:border-indigo-400/60"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Hora (opcional)</label>
                <input
                  type="time"
                  value={formRecordatorio.hora}
                  onChange={e => setFormRecordatorio({ ...formRecordatorio, hora: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-base outline-none focus:border-indigo-400/60"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 -mt-2">Si no eliges hora, se usa 8:00 a.m. por defecto.</p>

            <button
              onClick={agregarRecordatorio}
              disabled={!formRecordatorio.titulo.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm
                disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              Agregar recordatorio
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL ORDEN SUGERIDO */}
      {showSugerencia && (
        <Modal titulo="Orden sugerido de S.A.P.O" onClose={() => setShowSugerencia(false)}>
          {ordenSugerido.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No hay tareas pendientes hoy. O ya ganaste el día, o aún no has creado ninguna. Sospechoso.
            </p>
          ) : (
            <div className="space-y-3">
              {ordenSugerido.map((t, i) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 break-words">{t.titulo}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Prioridad {t.nivel}/5 · {formatDuracion(t.duracion)}
                    </p>
                    <p className="text-[11px] text-indigo-300 italic mt-1">{tipSugerencia(i, ordenSugerido.length)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* VENTANA FLOTANTE DE S.A.P.O (saludo diario u onboarding) */}
      {showGreeting && (
        <SapoSheet
          mode={sapoMode}
          message={greetingMsg}
          nombre={nombre}
          onNombreChange={setNombre}
          onPrimary={sapoMode === 'onboarding' ? completarOnboarding : () => setShowGreeting(false)}
          onClose={() => setShowGreeting(false)}
        />
      )}

      {/* MODAL DE ESTADÍSTICAS DE RACHA */}
      {showRachaInfo && (
        <Modal titulo="Tu racha" onClose={() => setShowRachaInfo(false)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
              <Flame className="w-9 h-9 text-orange-400 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-white leading-none">{racha} {racha === 1 ? 'día' : 'días'}</p>
                <p className="text-xs text-slate-400 mt-1.5">{mensajeRacha(racha)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-lg font-bold text-emerald-300">{mejorRacha}</p>
                <p className="text-[11px] text-slate-500">Mejor racha</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-lg font-bold text-indigo-300">{porcentajeCumplimiento}%</p>
                <p className="text-[11px] text-slate-500">Días cumplidos</p>
              </div>
            </div>

            {diaMasProductivo && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Tu día más productivo</p>
                  <p className="text-sm font-semibold text-slate-100">
                    {formatFechaCorta(diaMasProductivo.fecha)} · {diaMasProductivo.puntosObtenidos} pts
                  </p>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 italic">
              {finDeSemanaLibre
                ? 'Los fines de semana no afectan tu racha (configuración activa).'
                : 'Los fines de semana sí cuentan para tu racha. Puedes cambiar esto en Configuración.'}
            </p>
          </div>
        </Modal>
      )}

      {/* MODAL CONFIGURACIÓN */}
      {showSettings && (
        <Modal titulo="Configuración" onClose={() => setShowSettings(false)}>
          <div className="space-y-5">
            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Tu nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="¿Cómo te llamamos?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-base outline-none focus:border-indigo-400/60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Meta diaria</label>
                <span className="text-sm font-semibold text-slate-200">{metaPorcentaje}%</span>
              </div>
              <input
                type="range" min="30" max="100" step="5"
                value={metaPorcentaje}
                onChange={e => setMetaPorcentaje(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Días que no cuentan para la racha */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <p className="text-sm text-slate-300 font-medium">Días que no cuentan para la racha</p>

              <button
                onClick={() => setFinDeSemanaLibre(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium transition
                  ${finDeSemanaLibre ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
              >
                Fines de semana no cuentan
                <span className={`w-9 h-5 rounded-full relative transition-colors ${finDeSemanaLibre ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${finDeSemanaLibre ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </span>
              </button>

              <div>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Festivos manuales (no calculamos festivos colombianos automáticamente para no arriesgarnos a poner una fecha mal — agrégalos tú):
                </p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={nuevoFestivo}
                    onChange={e => setNuevoFestivo(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-indigo-400/60"
                  />
                  <button
                    onClick={agregarFestivo}
                    disabled={!nuevoFestivo}
                    className="px-3 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 disabled:opacity-40"
                    aria-label="Agregar festivo"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {festivosManual.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                    {festivosManual.map(f => (
                      <div key={f} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-2.5 py-1.5">
                        <span className="text-slate-300">{formatFechaCorta(f)}</span>
                        <button onClick={() => quitarFestivo(f)} className="text-slate-500 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-sm text-slate-300">
                  {notifPermiso === 'granted' ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-slate-500" />}
                  Notificaciones
                </span>
                <span className="text-xs text-slate-500 capitalize">{notifPermiso}</span>
              </div>
              {notifPermiso !== 'granted' && (
                <button
                  onClick={solicitarPermisoNotif}
                  className="w-full py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-medium"
                >
                  Activar notificaciones
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="flex items-center gap-1.5 text-sm text-slate-300 mb-2">
                <Award className="w-4 h-4 text-amber-400" /> Historial reciente
              </p>
              {historial.length === 0 && (
                <p className="text-xs text-slate-600 italic">Aún no hay historial. Empieza a fallar o a triunfar.</p>
              )}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {historial.slice(-7).reverse().map(h => (
                  <div key={h.fecha} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{h.fecha}{h.libre ? ' (libre)' : ''}</span>
                    <span className={h.cumplida ? 'text-emerald-400' : 'text-red-400'}>
                      {h.puntosObtenidos}/{h.puntosMeta} pts {h.cumplida ? '✅' : '❌'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={resetearDatos}
              className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium"
            >
              Reiniciar todos los datos
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
