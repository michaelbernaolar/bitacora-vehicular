// Datos y cálculos de la bitácora. Todo se guarda en el navegador (localStorage).

const KEY = 'bitacora.v1';

export const PLANES = {
  // Intervalos referenciales. Cada usuario puede editarlos según el manual de su vehículo.
  moto: [
    { nombre: 'Cambio de aceite', cadaKm: 2000, cadaMeses: 3 },
    { nombre: 'Lubricar y tensar cadena', cadaKm: 500, cadaMeses: null },
    { nombre: 'Filtro de aire', cadaKm: 6000, cadaMeses: 12 },
    { nombre: 'Bujía', cadaKm: 8000, cadaMeses: null },
    { nombre: 'Revisión de frenos', cadaKm: 5000, cadaMeses: 6 },
    { nombre: 'SOAT', cadaKm: null, cadaMeses: 12 },
  ],
  auto: [
    { nombre: 'Cambio de aceite y filtro', cadaKm: 5000, cadaMeses: 6 },
    { nombre: 'Filtro de aire', cadaKm: 10000, cadaMeses: 12 },
    { nombre: 'Rotación de llantas', cadaKm: 10000, cadaMeses: null },
    { nombre: 'Revisión de frenos', cadaKm: 20000, cadaMeses: 12 },
    { nombre: 'Líquido de frenos', cadaKm: null, cadaMeses: 24 },
    { nombre: 'Refrigerante', cadaKm: 40000, cadaMeses: 24 },
    { nombre: 'Bujías', cadaKm: 40000, cadaMeses: null },
    { nombre: 'SOAT', cadaKm: null, cadaMeses: 12 },
    { nombre: 'Revisión técnica', cadaKm: null, cadaMeses: 12 },
  ],
};

export const TIPOS_REGISTRO = {
  combustible: 'Combustible',
  mantenimiento: 'Mantenimiento',
  reparacion: 'Reparación',
  otro: 'Otro gasto',
};

const vacio = () => ({
  version: 1,
  ajustes: { moneda: 'S/', volumen: 'gal' },
  vehiculos: [],
  registros: [],
  tareas: [],
});

let db = cargar();

function cargar() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return vacio();
    return normalizar(JSON.parse(raw));
  } catch {
    return vacio();
  }
}

function normalizar(d) {
  const base = vacio();
  return {
    version: 1,
    ajustes: { ...base.ajustes, ...(d.ajustes || {}) },
    vehiculos: Array.isArray(d.vehiculos) ? d.vehiculos : [],
    registros: Array.isArray(d.registros) ? d.registros : [],
    tareas: Array.isArray(d.tareas) ? d.tareas : [],
  };
}

function guardar() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const hoyISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

// ---------- Lectura ----------

export const ajustes = () => db.ajustes;
export const vehiculos = () => [...db.vehiculos];
export const vehiculo = (id) => db.vehiculos.find((v) => v.id === id);

export const registrosDe = (vid) =>
  db.registros
    .filter((r) => r.vehiculoId === vid)
    .sort((a, b) => (b.fecha.localeCompare(a.fecha)) || (b.km - a.km));

export const tareasDe = (vid) => db.tareas.filter((t) => t.vehiculoId === vid);
export const registro = (id) => db.registros.find((r) => r.id === id);
export const tarea = (id) => db.tareas.find((t) => t.id === id);

export function kmActual(vid) {
  const v = vehiculo(vid);
  if (!v) return 0;
  return db.registros
    .filter((r) => r.vehiculoId === vid)
    .reduce((m, r) => Math.max(m, Number(r.km) || 0), Number(v.kmInicial) || 0);
}

// ---------- Escritura ----------

export function guardarVehiculo(datos) {
  const existente = datos.id && vehiculo(datos.id);
  if (existente) {
    Object.assign(existente, datos);
  } else {
    const v = { ...datos, id: uid(), fechaAlta: datos.fechaAlta || hoyISO() };
    db.vehiculos.push(v);
    for (const t of PLANES[v.tipo] || []) {
      db.tareas.push({ ...t, id: uid(), vehiculoId: v.id });
    }
    datos = v;
  }
  guardar();
  return existente || datos;
}

export function borrarVehiculo(id) {
  db.vehiculos = db.vehiculos.filter((v) => v.id !== id);
  db.registros = db.registros.filter((r) => r.vehiculoId !== id);
  db.tareas = db.tareas.filter((t) => t.vehiculoId !== id);
  guardar();
}

export function guardarRegistro(datos) {
  const existente = datos.id && registro(datos.id);
  if (existente) Object.assign(existente, datos);
  else db.registros.push({ ...datos, id: uid() });
  guardar();
}

export function borrarRegistro(id) {
  db.registros = db.registros.filter((r) => r.id !== id);
  guardar();
}

export function guardarTarea(datos) {
  const existente = datos.id && tarea(datos.id);
  if (existente) Object.assign(existente, datos);
  else db.tareas.push({ ...datos, id: uid() });
  guardar();
}

export function borrarTarea(id) {
  db.tareas = db.tareas.filter((t) => t.id !== id);
  db.registros.forEach((r) => {
    if (Array.isArray(r.tareas)) r.tareas = r.tareas.filter((x) => x !== id);
  });
  guardar();
}

export function guardarAjustes(a) {
  db.ajustes = { ...db.ajustes, ...a };
  guardar();
}

export const exportar = () => JSON.stringify({ ...db, exportado: new Date().toISOString() }, null, 2);

export function importar(texto) {
  const d = JSON.parse(texto);
  if (!d || !Array.isArray(d.vehiculos)) throw new Error('El archivo no es un respaldo de la bitácora.');
  db = normalizar(d);
  guardar();
}

// ---------- Cálculos ----------

function sumarMeses(iso, meses) {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(y, m - 1 + meses, 1);
  const ultimo = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate();
  f.setDate(Math.min(d, ultimo));
  return f;
}

function diasHasta(fecha) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((fecha - hoy) / 86400000);
}

/** Estado de una tarea de mantenimiento: cuándo toca y cuánto falta. */
export function estadoTarea(t) {
  const v = vehiculo(t.vehiculoId);
  const km = kmActual(t.vehiculoId);
  const ultimo = db.registros
    .filter((r) => r.vehiculoId === t.vehiculoId && Array.isArray(r.tareas) && r.tareas.includes(t.id))
    .sort((a, b) => (b.km - a.km) || b.fecha.localeCompare(a.fecha))[0];

  const baseKm = ultimo ? Number(ultimo.km) : Number(v?.kmInicial) || 0;
  const baseFecha = ultimo ? ultimo.fecha : v?.fechaAlta || hoyISO();

  const tocaKm = t.cadaKm ? baseKm + Number(t.cadaKm) : null;
  const tocaFecha = t.cadaMeses ? sumarMeses(baseFecha, Number(t.cadaMeses)) : null;
  const faltanKm = tocaKm != null ? tocaKm - km : null;
  const faltanDias = tocaFecha ? diasHasta(tocaFecha) : null;

  // Fracción del intervalo ya consumida (0 = recién hecho, 1 = toca ahora)
  const fracKm = t.cadaKm ? (km - baseKm) / t.cadaKm : 0;
  const fracDias = t.cadaMeses ? 1 - faltanDias / (t.cadaMeses * 30.4) : 0;
  const avance = Math.max(fracKm, fracDias);

  let estado = 'ok';
  if ((faltanKm != null && faltanKm <= 0) || (faltanDias != null && faltanDias <= 0)) estado = 'vencido';
  else if (
    (faltanKm != null && faltanKm <= Math.max(t.cadaKm * 0.15, 100)) ||
    (faltanDias != null && faltanDias <= 30)
  ) estado = 'pronto';

  return { tarea: t, ultimo, tocaKm, tocaFecha, faltanKm, faltanDias, avance, estado };
}

export function planOrdenado(vid) {
  return tareasDe(vid)
    .map(estadoTarea)
    .sort((a, b) => b.avance - a.avance);
}

export function peorEstado(vid) {
  const plan = planOrdenado(vid);
  if (plan.some((p) => p.estado === 'vencido')) return 'vencido';
  if (plan.some((p) => p.estado === 'pronto')) return 'pronto';
  return 'ok';
}

/** Rendimiento promedio usando el método de tanque lleno a tanque lleno. */
export function rendimiento(vid) {
  const cargas = db.registros
    .filter((r) => r.vehiculoId === vid && r.tipo === 'combustible' && Number(r.volumen) > 0)
    .sort((a, b) => a.km - b.km);
  let ultimoLleno = null;
  let acumulado = 0;
  let distancia = 0;
  let volumen = 0;
  for (const c of cargas) {
    if (c.lleno) {
      if (ultimoLleno != null && c.km > ultimoLleno) {
        distancia += c.km - ultimoLleno;
        volumen += acumulado + Number(c.volumen);
      }
      ultimoLleno = c.km;
      acumulado = 0;
    } else if (ultimoLleno != null) {
      acumulado += Number(c.volumen);
    }
  }
  return volumen > 0 ? distancia / volumen : null;
}

export function gastos(vid) {
  const regs = registrosDe(vid);
  const total = regs.reduce((s, r) => s + (Number(r.costo) || 0), 0);
  const mesActual = hoyISO().slice(0, 7);
  const mes = regs
    .filter((r) => r.fecha.startsWith(mesActual))
    .reduce((s, r) => s + (Number(r.costo) || 0), 0);

  // Últimos 6 meses, de más antiguo a más reciente
  const meses = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const f = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    const porTipo = { combustible: 0, mantenimiento: 0, reparacion: 0, otro: 0 };
    regs.filter((r) => r.fecha.startsWith(clave)).forEach((r) => {
      porTipo[r.tipo] = (porTipo[r.tipo] || 0) + (Number(r.costo) || 0);
    });
    meses.push({ clave, fecha: f, porTipo, total: Object.values(porTipo).reduce((a, b) => a + b, 0) });
  }
  return { total, mes, meses };
}

// ---------- Datos de ejemplo ----------

export function cargarEjemplo() {
  const hoy = new Date();
  const fecha = (diasAtras) => {
    const f = new Date(hoy);
    f.setDate(f.getDate() - diasAtras);
    f.setMinutes(f.getMinutes() - f.getTimezoneOffset());
    return f.toISOString().slice(0, 10);
  };

  const moto = guardarVehiculo({
    tipo: 'moto', nombre: 'La roja', marca: 'Honda', modelo: 'CB 190R', anio: 2022,
    placa: '1234-AB', kmInicial: 14100, fechaAlta: fecha(170),
  });
  const auto = guardarVehiculo({
    tipo: 'auto', nombre: 'Auto de casa', marca: 'Toyota', modelo: 'Yaris', anio: 2018,
    placa: 'ABC-123', kmInicial: 82000, fechaAlta: fecha(200),
  });

  const t = (vid, nombre) => tareasDe(vid).find((x) => x.nombre.startsWith(nombre))?.id;
  const regs = [];
  let km = 14100;
  for (let i = 0; i < 12; i++) {
    km += 260 + ((i * 37) % 90);
    regs.push({ vehiculoId: moto.id, tipo: 'combustible', fecha: fecha(165 - i * 14), km, volumen: 2.6 + ((i * 3) % 5) / 10, costo: 46 + ((i * 7) % 9), lleno: true, notas: '' });
  }
  regs.push({ vehiculoId: moto.id, tipo: 'mantenimiento', fecha: fecha(120), km: 15050, costo: 85, tareas: [t(moto.id, 'Cambio de aceite'), t(moto.id, 'Lubricar')].filter(Boolean), lugar: 'Taller Moto Center', notas: 'Aceite 20W-50 semisintético' });
  regs.push({ vehiculoId: moto.id, tipo: 'mantenimiento', fecha: fecha(30), km: km - 300, costo: 15, tareas: [t(moto.id, 'Lubricar')].filter(Boolean), lugar: '', notas: '' });
  regs.push({ vehiculoId: moto.id, tipo: 'mantenimiento', fecha: fecha(150), km: 14400, costo: 120, tareas: [t(moto.id, 'SOAT')].filter(Boolean), lugar: '', notas: 'SOAT renovado' });
  regs.push({ vehiculoId: moto.id, tipo: 'reparacion', fecha: fecha(60), km: km - 700, costo: 65, lugar: 'Taller Moto Center', notas: 'Cambio de manija de embrague' });

  let ka = 82000;
  for (let i = 0; i < 8; i++) {
    ka += 520 + ((i * 53) % 140);
    regs.push({ vehiculoId: auto.id, tipo: 'combustible', fecha: fecha(190 - i * 24), km: ka, volumen: 8.5 + ((i * 3) % 6) / 4, costo: 140 + ((i * 11) % 30), lleno: true, notas: '' });
  }
  regs.push({ vehiculoId: auto.id, tipo: 'mantenimiento', fecha: fecha(95), km: 84100, costo: 210, tareas: [t(auto.id, 'Cambio de aceite')].filter(Boolean), lugar: 'Lubricentro', notas: '' });
  regs.push({ vehiculoId: auto.id, tipo: 'otro', fecha: fecha(12), km: ka, costo: 30, notas: 'Lavado completo' });

  regs.forEach(guardarRegistro);
  return moto;
}
