import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  CheckCircle2, Circle, Flame, Plus, X, Settings, Trash2, Clock,
  AlertTriangle, Star, Bell, BellOff, ChevronDown, ChevronUp,
  Target, Sparkles, RotateCcw, ListChecks, LayoutGrid, Award
} from 'lucide-react';

/* ============================================================
   CONSTANTES Y DATOS ESTÁTICOS
   ============================================================ */
const STORAGE_KEY = 'organizapp_data_v1';

const CATEGORIAS = {
  trabajo:  { label: 'Trabajo',  color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  salud:    { label: 'Salud',    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  social:   { label: 'Social',   color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  pareja:   { label: 'Pareja',   color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  personal: { label: 'Personal', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  otro:     { label: 'Otro',     color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
};

const NIVEL_LABEL = { 1: 'Baja', 2: 'Media', 3: 'Alta' };

const CUADRANTES_INFO = {
  hacer:     { label: 'Hacer Ya',  emoji: '🔥', desc: 'Urgente + Importante',     ring: 'border-red-500/40',   glow: 'shadow-red-500/10' },
  programar: { label: 'Programar', emoji: '📅', desc: 'Importante, no urgente',   ring: 'border-blue-500/40',  glow: 'shadow-blue-500/10' },
  delegar:   { label: 'Delegar',   emoji: '🤝', desc: 'Urgente, no importante',   ring: 'border-amber-500/40', glow: 'shadow-amber-500/10' },
  eliminar:  { label: 'Eliminar',  emoji: '🗑️', desc: 'Ni urgente ni importante', ring: 'border-slate-500/40', glow: 'shadow-slate-500/10' },
};

// El "coach" ácido de la app. Frases separadas por tipo de evento.
const MSG_COMPLETAR = [
  '¡Por fin hiciste algo útil hoy!',
  'Wow, sobreviviste 30 minutos de esfuerzo. Que alguien te dé una medalla.',
  'Milagro: una tarea completada sin excusas de por medio.',
  'Tu yo del futuro te lo agradece, aunque no lo merezcas del todo.',
  'Increíble, cumpliste. Guárdalo en tu currículum de "logros inesperados".',
  'Punto para ti. Solo uno, no te emociones.',
  'Mira nada más, resultó que sí sabías hacer cosas.',
  '¿Ves? No era tan difícil como tu procrastinación te hizo creer.',
];

const MSG_ROAST = [
  'Tu procrastinación debería ser deporte olímpico.',
  'El futuro tú te está odiando ahora mismo.',
  'Esa tarea no se va a hacer sola, pero tú tampoco ayudas mucho.',
  'Posponer: tu talento oculto más desarrollado.',
  '"Después lo hago", dijiste ayer también.',
  'A este ritmo tu racha va a durar menos que tus propósitos de enero.',
  'La procrastinación te manda saludos, parece que son íntimos.',
  'Aplazaste otra vez. Impresionante consistencia... en lo malo.',
];

const MSG_RACHA_PERDIDA = [
  'Tu racha murió. Que descanse en paz, duró lo que un propósito de año nuevo.',
  'Racha reiniciada a 0. Como tus ganas de esforzarte, aparentemente.',
  'Se rompió la racha. Un momento de silencio por tu disciplina.',
  'Racha: 0. Motivación: también 0. Vamos, se puede reconstruir.',
  'Perdiste la racha, pero al menos eres consistente... en perderla.',
];

const MSG_META_CUMPLIDA = [
  '¡Meta diaria cumplida! Los milagros sí existen.',
  'Llegaste a la meta. Alguien avise a los periódicos.',
  'Meta del día superada. Tu procrastinación descansa hoy, no te acostumbres.',
  '¡Lo lograste! Guarda esta racha de buen comportamiento, no es común.',
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

function calcularPuntos(duracionMin, nivelImportancia) {
  const d = Number(duracionMin) || 0;
  const n = Number(nivelImportancia) || 1;
  return Math.round(d * n);
}

function getQuadrant(urgente, importante) {
  if (urgente && importante) return 'hacer';
  if (!urgente && importante) return 'programar';
  if (urgente && !importante) return 'delegar';
  return 'eliminar';
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

// Toast del "coach" sarcástico
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
          <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            <Star className="w-3 h-3 text-amber-400" /> {tarea.puntos} pts
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> {tarea.duracion} min
          </span>
          {tarea.hora && (
            <span className="flex items-center gap-1 text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              <Bell className="w-3 h-3" /> {tarea.hora}
            </span>
          )}
          {tarea.recurrente && (
            <span className="flex items-center gap-1 text-[11px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">
              <RotateCcw className="w-3 h-3" /> diaria
            </span>
          )}
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

// Modal genérico
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

  // --- Estado ---
  const [tareas, setTareas] = useState(saved.tareas || []);
  const [historial, setHistorial] = useState(saved.historial || []);
  const [racha, setRacha] = useState(saved.racha || 0);
  const [metaPorcentaje, setMetaPorcentaje] = useState(saved.metaPorcentaje ?? 70);
  const [lastActiveDate, setLastActiveDate] = useState(saved.lastActiveDate || hoyISO());

  const [notifPermiso, setNotifPermiso] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [vistaLista, setVistaLista] = useState(false);
  const [coachMsg, setCoachMsg] = useState(null);
  const [cuadrantesAbiertos, setCuadrantesAbiertos] = useState({
    hacer: true, programar: true, delegar: true, eliminar: true,
  });

  const [form, setForm] = useState({
    titulo: '', categoria: 'trabajo', duracion: 30, nivel: 2,
    urgente: false, importante: true, hora: '', recurrente: false,
  });

  // --- Mostrar mensaje del coach con auto-dismiss ---
  const mostrarCoach = useCallback((texto, tipo) => {
    setCoachMsg({ texto, tipo, id: Date.now() + Math.random() });
  }, []);

  useEffect(() => {
    if (!coachMsg) return;
    const t = setTimeout(() => setCoachMsg(null), 4200);
    return () => clearTimeout(t);
  }, [coachMsg]);

  /* --------------------------------------------------------
     CIERRE DE DÍA: evalúa racha y reinicia tareas recurrentes
     -------------------------------------------------------- */
  const procesarCierreDia = useCallback((fechaAnterior, fechaNueva) => {
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
          { fecha: fechaAnterior, puntosObtenidos: completadoAyer, puntosMeta: Math.round(metaAyer), cumplida },
        ].slice(-90)); // guarda últimos 90 días

        setRacha(prevRacha => {
          if (cumplida) return prevRacha + 1;
          mostrarCoach(pickRandom(MSG_RACHA_PERDIDA), 'racha');
          return 0;
        });
      }

      // Tareas recurrentes -> se reinician para el nuevo día
      // Tareas no recurrentes de ayer -> se archivan (se quitan de la lista activa)
      const nuevasTareas = prevTareas
        .filter(t => t.fecha !== fechaAnterior || t.recurrente)
        .map(t => t.fecha === fechaAnterior && t.recurrente
          ? { ...t, fecha: fechaNueva, completada: false, notificado: false }
          : t
        );
      return nuevasTareas;
    });

    setLastActiveDate(fechaNueva);
  }, [metaPorcentaje, mostrarCoach]);

  // Revisa si cambió el día (al montar y cada minuto)
  useEffect(() => {
    const check = () => {
      const hoy = hoyISO();
      if (hoy !== lastActiveDate) {
        procesarCierreDia(lastActiveDate, hoy);
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [lastActiveDate, procesarCierreDia]);

  /* --------------------------------------------------------
     NOTIFICACIONES: revisa recordatorios cada 30s
     -------------------------------------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      if (notifPermiso !== 'granted') return;
      const ahora = new Date();
      const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
      const hoy = hoyISO();

      setTareas(prev => {
        let huboMatch = false;
        const actualizadas = prev.map(t => {
          if (t.fecha === hoy && t.hora === hhmm && !t.notificado && !t.completada) {
            huboMatch = true;
            try {
              new Notification('⏰ OrganizApp te recuerda', {
                body: `"${t.titulo}" — o lo haces ahora, o le sigues dando largas.`,
              });
            } catch (e) { /* noop */ }
            return { ...t, notificado: true };
          }
          return t;
        });
        return huboMatch ? actualizadas : prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [notifPermiso]);

  /* --------------------------------------------------------
     PERSISTIR EN LOCALSTORAGE
     -------------------------------------------------------- */
  useEffect(() => {
    guardarEstado({ tareas, historial, racha, metaPorcentaje, lastActiveDate });
  }, [tareas, historial, racha, metaPorcentaje, lastActiveDate]);

  /* --------------------------------------------------------
     ACCIONES
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
      urgente: form.urgente,
      importante: form.importante,
      hora: form.hora || null,
      recurrente: form.recurrente,
      puntos: calcularPuntos(form.duracion, form.nivel),
      fecha: hoyISO(),
      completada: false,
      notificado: false,
    };
    setTareas(prev => [...prev, nueva]);
    setForm({ titulo: '', categoria: 'trabajo', duracion: 30, nivel: 2, urgente: false, importante: true, hora: '', recurrente: false });
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

      const hoy = hoyISO();
      const tareasHoy = nuevasTareas.filter(t => t.fecha === hoy);
      const totalHoy = tareasHoy.reduce((s, t) => s + t.puntos, 0);
      const completadoHoy = tareasHoy.filter(t => t.completada).reduce((s, t) => s + t.puntos, 0);
      const metaHoy = totalHoy * metaPorcentaje / 100;
      const completadoAntes = completadoHoy - tarea.puntos;

      if (metaHoy > 0 && completadoAntes < metaHoy && completadoHoy >= metaHoy) {
        setTimeout(() => mostrarCoach(pickRandom(MSG_META_CUMPLIDA), 'meta'), 1500);
      }
    } else {
      mostrarCoach(pickRandom(MSG_ROAST), 'roast');
    }
  };

  const eliminarTarea = (id) => {
    setTareas(prev => prev.filter(t => t.id !== id));
  };

  const resetearDatos = () => {
    if (!window.confirm('¿Seguro? Esto borra tareas, racha e historial. No hay vuelta atrás.')) return;
    setTareas([]);
    setHistorial([]);
    setRacha(0);
    setLastActiveDate(hoyISO());
    setShowSettings(false);
  };

  /* --------------------------------------------------------
     DATOS DERIVADOS
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
      const q = getQuadrant(t.urgente, t.importante);
      grupos[q].push(t);
    });
    return grupos;
  }, [tareasHoy]);

  const toggleCuadrante = (q) => setCuadrantesAbiertos(prev => ({ ...prev, [q]: !prev[q] }));

  /* --------------------------------------------------------
     RENDER
     -------------------------------------------------------- */
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <style>{`
        @keyframes slideDown { from { opacity:0; transform: translate(-50%, -12px);} to { opacity:1; transform: translate(-50%, 0);} }
        @keyframes slideUp { from { opacity:0; transform: translateY(24px);} to { opacity:1; transform: translateY(0);} }
      `}</style>

      <CoachToast mensaje={coachMsg} />

      {/* HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-slate-950/70 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h1 className="text-lg font-bold tracking-tight">OrganizApp</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold
              ${racha > 0 ? 'bg-orange-500/15 border-orange-500/30 text-orange-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
              <Flame className={`w-4 h-4 ${racha > 0 ? 'text-orange-400' : 'text-slate-500'}`} />
              {racha}
            </div>
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

        {/* PROGRESO DEL DÍA */}
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

        {/* TOGGLE DE VISTA */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setVistaLista(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition
              ${!vistaLista ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <LayoutGrid className="w-4 h-4" /> Cuadrantes
          </button>
          <button
            onClick={() => setVistaLista(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition
              ${vistaLista ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ListChecks className="w-4 h-4" /> Lista
          </button>
        </div>

        {/* VISTA CUADRANTES */}
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

        {/* VISTA LISTA */}
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
      </main>

      {/* BOTÓN FLOTANTE AGREGAR */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-5 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
          shadow-xl shadow-purple-900/40 flex items-center justify-center active:scale-90 transition-transform"
        aria-label="Agregar tarea"
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

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
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400/60"
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Duración (min)</label>
                <input
                  type="number" min="1"
                  value={form.duracion}
                  onChange={e => setForm({ ...form, duracion: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400/60"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Importancia</label>
                <div className="flex gap-1">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      onClick={() => setForm({ ...form, nivel: n })}
                      className={`flex-1 text-xs py-2 rounded-lg border transition
                        ${form.nivel === n ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-200' : 'bg-white/5 border-white/10 text-slate-400'}`}
                    >
                      {NIVEL_LABEL[n]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setForm({ ...form, urgente: !form.urgente })}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl border transition
                  ${form.urgente ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Urgente
              </button>
              <button
                onClick={() => setForm({ ...form, importante: !form.importante })}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl border transition
                  ${form.importante ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
              >
                <Star className="w-3.5 h-3.5" /> Importante
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Recordatorio (opcional)</label>
                <input
                  type="time"
                  value={form.hora}
                  onChange={e => setForm({ ...form, hora: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400/60"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setForm({ ...form, recurrente: !form.recurrente })}
                  className={`w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl border transition
                    ${form.recurrente ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Diaria
                </button>
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

      {/* MODAL CONFIGURACIÓN */}
      {showSettings && (
        <Modal titulo="Configuración" onClose={() => setShowSettings(false)}>
          <div className="space-y-5">
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
                    <span className="text-slate-500">{h.fecha}</span>
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
