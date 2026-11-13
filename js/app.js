import * as S from './store.js';

const $app = document.getElementById('app');
const $sheet = document.getElementById('sheet');
const $sheetBody = document.getElementById('sheet-body');
const $toast = document.getElementById('toast');

// ---------- Utilidades ----------

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nf = new Intl.NumberFormat('es-PE');
const nf1 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
const km = (n) => `${nf.format(Math.round(n))} km`;
const dinero = (n) => `${S.ajustes().moneda} ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)}`;
const unidadVol = () => (S.ajustes().volumen === 'L' ? 'L' : 'gal');
const fechaLarga = (d) =>
  (typeof d === 'string' ? new Date(d + 'T12:00:00') : d).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
const mesNombre = (d) => d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
const mesLargo = (clave) => {
  const [y, m] = clave.split('-').map(Number);
  const t = new Date(y, m - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const ICONOS = {
  moto: `<svg viewBox="0 0 48 32" aria-hidden="true"><circle cx="10" cy="22" r="7.5"/><circle cx="38" cy="22" r="7.5"/><path d="M10 22l8-11h9l4 6h7M27 11l-3-4h-5M31 17l-9 5h-8M38 22l-6-11h5"/></svg>`,
  auto: `<svg viewBox="0 0 48 32" aria-hidden="true"><path d="M4 22v-5l5-2 5-6h17l7 6 6 1.5V22h-4M14 22h16"/><circle cx="10" cy="22" r="4.5"/><circle cx="34" cy="22" r="4.5"/><path d="M15 15h22"/></svg>`,
};
const ICONO_TIPO = {
  combustible: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9M14 8l3 2v7a1.5 1.5 0 0 0 3 0V9l-2-3"/></svg>`,
  mantenimiento: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3L15 12l-3-3z"/></svg>`,
  reparacion: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/></svg>`,
  otro: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/></svg>`,
};

function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('is-on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $toast.classList.remove('is-on'), 2400);
}

function abrirHoja(html, alMontar) {
  $sheetBody.innerHTML = html;
  if (!$sheet.open) $sheet.showModal();
  alMontar?.($sheetBody);
  const primero = $sheetBody.querySelector('[autofocus]');
  primero?.focus();
}
function cerrarHoja() {
  if ($sheet.open) $sheet.close();
}
$sheet.addEventListener('click', (e) => {
  if (e.target === $sheet) cerrarHoja(); // toque fuera de la hoja
  if (e.target.closest('[data-cerrar]')) cerrarHoja();
});

function confirmar({ titulo, texto, accion }) {
  return new Promise((resolve) => {
    abrirHoja(`
      <h2 id="sheet-title" class="sheet__title">${esc(titulo)}</h2>
      <p class="sheet__text">${esc(texto)}</p>
      <div class="sheet__actions">
        <button type="button" class="btn btn--ghost" data-r="0">Cancelar</button>
        <button type="button" class="btn btn--danger" data-r="1">${esc(accion)}</button>
      </div>`, (el) => {
      el.querySelectorAll('[data-r]').forEach((b) =>
        b.addEventListener('click', () => { cerrarHoja(); resolve(b.dataset.r === '1'); }));
    });
    $sheet.addEventListener('close', () => resolve(false), { once: true });
  });
}

// ---------- Rutas ----------
// #/            → garaje
// #/v/ID        → vehículo (pestaña resumen)
// #/v/ID/plan   → vehículo (pestaña plan)

function ruta() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (partes[0] === 'v' && S.vehiculo(partes[1])) return { vista: 'vehiculo', id: partes[1], tab: partes[2] || 'resumen' };
  return { vista: 'garaje' };
}

let ultimaVista = '';
function render() {
  const r = ruta();
  const clave = r.vista + (r.id || '');
  const animar = clave !== ultimaVista;
  ultimaVista = clave;
  if (r.vista === 'vehiculo') renderVehiculo(r.id, r.tab, animar);
  else renderGaraje();
}
window.addEventListener('hashchange', () => { cerrarHoja(); render(); window.scrollTo(0, 0); });

// ---------- Garaje ----------

function renderGaraje() {
  document.title = 'Bitácora vehicular';
  const lista = S.vehiculos();
  const estados = { ok: 'Al día', pronto: 'Servicio pronto', vencido: 'Servicio vencido' };

  $app.innerHTML = `
    <header class="top">
      <div>
        <h1 class="top__title">Mi garaje</h1>
        <p class="top__sub">${lista.length ? `${lista.length} ${lista.length === 1 ? 'vehículo' : 'vehículos'}` : 'Bitácora de mantenimiento y gastos'}</p>
      </div>
      <button class="icon-btn" id="btn-ajustes" aria-label="Ajustes y respaldo">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
      </button>
    </header>

    ${lista.length ? `
      <ul class="garage">
        ${lista.map((v) => {
          const e = S.peorEstado(v.id);
          return `
          <li>
            <a class="garage__item" href="#/v/${v.id}">
              <span class="garage__icon garage__icon--${v.tipo}">${ICONOS[v.tipo]}</span>
              <span class="garage__info">
                <span class="garage__name">${esc(v.nombre || `${v.marca} ${v.modelo}`)}</span>
                <span class="garage__meta">${esc([v.marca, v.modelo, v.anio].filter(Boolean).join(' '))}</span>
                <span class="status status--${e}">${estados[e]}</span>
              </span>
              <span class="garage__right">
                ${v.placa ? `<span class="plate">${esc(v.placa)}</span>` : ''}
                <span class="garage__km">${km(S.kmActual(v.id))}</span>
              </span>
            </a>
          </li>`;
        }).join('')}
      </ul>
      <button class="btn btn--primary btn--block" id="btn-nuevo">Agregar vehículo</button>
    ` : `
      <section class="empty">
        <div class="empty__art">${ICONOS.moto}${ICONOS.auto}</div>
        <h2 class="empty__title">Agrega tu primer vehículo</h2>
        <p class="empty__text">Anota cada carga de combustible y cada visita al taller. La bitácora te avisa cuándo toca el cambio de aceite, el SOAT o la revisión técnica.</p>
        <button class="btn btn--primary btn--block" id="btn-nuevo">Agregar vehículo</button>
        <button class="btn btn--ghost btn--block" id="btn-ejemplo">Probar con datos de ejemplo</button>
      </section>
    `}
    <p class="foot">Tus datos se guardan solo en este dispositivo. Descarga un respaldo desde Ajustes.</p>
  `;

  $app.querySelector('#btn-nuevo').addEventListener('click', () => formVehiculo());
  $app.querySelector('#btn-ajustes').addEventListener('click', formAjustes);
  $app.querySelector('#btn-ejemplo')?.addEventListener('click', () => {
    S.cargarEjemplo();
    toast('Datos de ejemplo cargados');
    render();
  });
}

// ---------- Vehículo ----------

function odometro(valor, animar) {
  const digitos = String(Math.max(0, Math.round(valor))).padStart(6, '0').slice(-7).split('');
  return `<div class="odo ${animar ? 'odo--roll' : ''}" role="img" aria-label="Kilometraje: ${km(valor)}">
    ${digitos.map((d, i) => `
      <span class="odo__cell" aria-hidden="true">
        <span class="odo__strip" style="--d:${d};--i:${i}">${'0123456789'.split('').map((n) => `<span>${n}</span>`).join('')}</span>
      </span>`).join('')}
    <span class="odo__unit" aria-hidden="true">km</span>
  </div>`;
}

function textoFaltante(p) {
  const partes = [];
  if (p.faltanKm != null) partes.push(p.faltanKm > 0 ? `faltan ${km(p.faltanKm)}` : `pasado por ${km(-p.faltanKm)}`);
  if (p.faltanDias != null) {
    const d = p.faltanDias;
    partes.push(d > 0 ? (d > 60 ? `${Math.round(d / 30.4)} meses` : `${d} ${d === 1 ? 'día' : 'días'}`) : (d === 0 ? 'vence hoy' : `vencido hace ${-d} ${d === -1 ? 'día' : 'días'}`));
  }
  const t = partes.join(' o ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function sticker(p) {
  if (!p) return '';
  const lineas = [];
  if (p.tocaKm != null) lineas.push(`<div class="sticker__row"><span>A los</span><strong>${km(p.tocaKm)}</strong></div>`);
  if (p.tocaFecha) lineas.push(`<div class="sticker__row"><span>${p.tocaKm != null ? 'o el' : 'El'}</span><strong>${fechaLarga(p.tocaFecha)}</strong></div>`);
  return `
    <a class="sticker sticker--${p.estado}" href="#/v/${p.tarea.vehiculoId}/plan">
      <span class="sticker__head">Próximo servicio</span>
      <span class="sticker__task">${esc(p.tarea.nombre)}</span>
      ${lineas.join('')}
      <span class="sticker__foot">${textoFaltante(p)}</span>
      ${p.estado === 'vencido' ? '<span class="sticker__stamp" aria-hidden="true">Vencido</span>' : ''}
    </a>`;
}

function renderVehiculo(id, tab, animar) {
  const v = S.vehiculo(id);
  const kmv = S.kmActual(id);
  const plan = S.planOrdenado(id);
  document.title = `${v.nombre || v.modelo} · Bitácora`;

  const tabs = [['resumen', 'Resumen'], ['historial', 'Historial'], ['plan', 'Plan de servicio']];

  $app.innerHTML = `
    <header class="dash">
      <div class="dash__bar">
        <a class="icon-btn icon-btn--dark" href="#/" aria-label="Volver al garaje">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
        </a>
        <div class="dash__id">
          <h1 class="dash__name">${esc(v.nombre || `${v.marca} ${v.modelo}`)}</h1>
          <p class="dash__meta">${esc([v.marca, v.modelo, v.anio].filter(Boolean).join(' '))}</p>
        </div>
        ${v.placa ? `<span class="plate">${esc(v.placa)}</span>` : ''}
        <button class="icon-btn icon-btn--dark" id="btn-editar" aria-label="Editar vehículo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>
        </button>
      </div>
      <div class="dash__gauge">
        <span class="dash__icon">${ICONOS[v.tipo]}</span>
        ${odometro(kmv, animar)}
      </div>
    </header>

    ${sticker(plan[0])}

    <nav class="tabs" aria-label="Secciones del vehículo">
      ${tabs.map(([k, t]) => `<a href="#/v/${id}${k === 'resumen' ? '' : '/' + k}" class="tabs__tab" ${tab === k ? 'aria-current="page"' : ''}>${t}</a>`).join('')}
    </nav>

    <section class="panel">
      ${tab === 'historial' ? vistaHistorial(id) : tab === 'plan' ? vistaPlan(id, plan) : vistaResumen(id, plan)}
    </section>

    <button class="fab" id="btn-registrar">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      Registrar
    </button>
  `;

  $app.querySelector('#btn-editar').addEventListener('click', () => formVehiculo(v));
  $app.querySelector('#btn-registrar').addEventListener('click', () => formRegistro(id));
  $app.querySelectorAll('[data-registro]').forEach((el) =>
    el.addEventListener('click', () => formRegistro(id, S.registro(el.dataset.registro))));
  $app.querySelectorAll('[data-tarea]').forEach((el) =>
    el.addEventListener('click', () => formTarea(id, S.tarea(el.dataset.tarea))));
  $app.querySelector('#btn-tarea')?.addEventListener('click', () => formTarea(id));
  $app.querySelector('#btn-ver-plan')?.addEventListener('click', () => (location.hash = `#/v/${id}/plan`));
}

function vistaResumen(id, plan) {
  const g = S.gastos(id);
  const rend = S.rendimiento(id);
  const regs = S.registrosDe(id);
  const max = Math.max(...g.meses.map((m) => m.total), 1);
  const colores = ['combustible', 'mantenimiento', 'reparacion', 'otro'];

  if (!regs.length) {
    return `<div class="empty empty--inline">
      <h2 class="empty__title">Aún no hay registros</h2>
      <p class="empty__text">Empieza con tu próxima carga de combustible o con el último cambio de aceite que recuerdes. Con eso ya se calcula cuándo toca el siguiente.</p>
    </div>`;
  }

  return `
    <dl class="figures">
      <div><dt>Gastado este mes</dt><dd>${dinero(g.mes)}</dd></div>
      <div><dt>Rendimiento</dt><dd>${rend ? `${nf1.format(rend)} <small>km/${unidadVol()}</small>` : '<small>Registra dos tanques llenos</small>'}</dd></div>
      <div><dt>Gasto total</dt><dd>${dinero(g.total)}</dd></div>
      <div><dt>Registros</dt><dd>${regs.length}</dd></div>
    </dl>

    <h2 class="section-title">Gastos de los últimos 6 meses</h2>
    <div class="chart" role="img" aria-label="Gráfico de gastos por mes">
      ${g.meses.map((m) => `
        <div class="chart__col" title="${esc(mesLargo(m.clave))}: ${dinero(m.total)}">
          <span class="chart__val">${m.total ? nf.format(Math.round(m.total)) : ''}</span>
          <span class="chart__bar" style="height:${(m.total / max) * 100}%">
            ${colores.map((c) => (m.porTipo[c] ? `<span class="chart__seg chart__seg--${c}" style="flex:${m.porTipo[c]}"></span>` : '')).join('')}
          </span>
          <span class="chart__lab">${mesNombre(m.fecha)}</span>
        </div>`).join('')}
    </div>
    <ul class="legend">
      ${colores.map((c) => `<li><span class="legend__dot chart__seg--${c}"></span>${S.TIPOS_REGISTRO[c]}</li>`).join('')}
    </ul>

    <h2 class="section-title">Lo que viene</h2>
    <ul class="plan">${plan.slice(0, 3).map(filaPlan).join('')}</ul>
    <button class="btn btn--ghost btn--block" id="btn-ver-plan">Ver plan completo</button>
  `;
}

function filaPlan(p) {
  const pct = Math.min(Math.max(p.avance, 0), 1) * 100;
  const cada = [p.tarea.cadaKm ? `cada ${km(p.tarea.cadaKm)}` : '', p.tarea.cadaMeses ? `cada ${p.tarea.cadaMeses} ${p.tarea.cadaMeses == 1 ? 'mes' : 'meses'}` : ''].filter(Boolean).join(' o ');
  return `
    <li>
      <button class="plan__item" data-tarea="${p.tarea.id}">
        <span class="plan__top">
          <span class="plan__name">${esc(p.tarea.nombre)}</span>
          <span class="status status--${p.estado}">${textoFaltante(p)}</span>
        </span>
        <span class="gauge gauge--${p.estado}"><span style="width:${pct}%"></span></span>
        <span class="plan__meta">${cada}${p.ultimo ? `. Último: ${fechaLarga(p.ultimo.fecha)}, ${km(p.ultimo.km)}` : '. Sin registro previo'}</span>
      </button>
    </li>`;
}

function vistaPlan(id, plan) {
  return `
    <p class="hint">Los intervalos son referenciales. Ajústalos según el manual de tu vehículo o lo que te indique tu mecánico.</p>
    <ul class="plan">${plan.map(filaPlan).join('')}</ul>
    <button class="btn btn--ghost btn--block" id="btn-tarea">Agregar tarea al plan</button>
  `;
}

function vistaHistorial(id) {
  const regs = S.registrosDe(id);
  if (!regs.length) {
    return `<div class="empty empty--inline">
      <h2 class="empty__title">Historial vacío</h2>
      <p class="empty__text">Cada carga, servicio o reparación que registres aparecerá aquí, ordenado por fecha.</p>
    </div>`;
  }
  const grupos = {};
  regs.forEach((r) => (grupos[r.fecha.slice(0, 7)] ||= []).push(r));
  return Object.entries(grupos).map(([mes, lista]) => `
    <h2 class="section-title section-title--row">
      <span>${mesLargo(mes)}</span>
      <span>${dinero(lista.reduce((s, r) => s + (Number(r.costo) || 0), 0))}</span>
    </h2>
    <ul class="log">
      ${lista.map((r) => {
        const titulo = r.tipo === 'combustible'
          ? `Combustible, ${nf1.format(r.volumen || 0)} ${unidadVol()}${r.lleno ? ' (lleno)' : ''}`
          : r.tipo === 'mantenimiento'
            ? ((r.tareas || []).map((t) => S.tarea(t)?.nombre).filter(Boolean).join(', ') || 'Mantenimiento')
            : (r.notas || S.TIPOS_REGISTRO[r.tipo]);
        const sub = [fechaLarga(r.fecha), km(r.km), r.lugar].filter(Boolean).join(', ');
        return `
        <li>
          <button class="log__item" data-registro="${r.id}">
            <span class="log__icon log__icon--${r.tipo}">${ICONO_TIPO[r.tipo]}</span>
            <span class="log__text">
              <span class="log__title">${esc(titulo)}</span>
              <span class="log__sub">${esc(sub)}</span>
            </span>
            <span class="log__cost">${dinero(r.costo)}</span>
          </button>
        </li>`;
      }).join('')}
    </ul>`).join('');
}

// ---------- Formularios ----------

function campo(label, input, ayuda = '') {
  return `<label class="field"><span class="field__label">${label}</span>${input}${ayuda ? `<span class="field__help">${ayuda}</span>` : ''}</label>`;
}

function formVehiculo(v) {
  const nuevo = !v;
  v = v || { tipo: 'moto' };
  abrirHoja(`
    <h2 id="sheet-title" class="sheet__title">${nuevo ? 'Agregar vehículo' : 'Editar vehículo'}</h2>
    <form id="f" novalidate>
      <fieldset class="seg seg--big" ${nuevo ? '' : 'disabled'}>
        <legend class="field__label">Tipo</legend>
        ${['moto', 'auto'].map((t) => `
          <label class="seg__opt">
            <input type="radio" name="tipo" value="${t}" ${v.tipo === t ? 'checked' : ''}>
            <span>${ICONOS[t]}${t === 'moto' ? 'Moto' : 'Auto'}</span>
          </label>`).join('')}
      </fieldset>
      ${campo('Nombre o apodo', `<input name="nombre" value="${esc(v.nombre)}" placeholder="Ej. La roja" maxlength="40" autofocus>`)}
      <div class="grid2">
        ${campo('Marca', `<input name="marca" value="${esc(v.marca)}" placeholder="Honda" maxlength="30" required>`)}
        ${campo('Modelo', `<input name="modelo" value="${esc(v.modelo)}" placeholder="CB 190R" maxlength="30">`)}
        ${campo('Año', `<input name="anio" type="number" inputmode="numeric" min="1950" max="2100" value="${esc(v.anio)}" placeholder="2022">`)}
        ${campo('Placa', `<input name="placa" value="${esc(v.placa)}" placeholder="1234-AB" maxlength="10" autocapitalize="characters">`)}
      </div>
      ${campo('Kilometraje actual', `<input name="kmInicial" type="number" inputmode="numeric" min="0" value="${esc(v.kmInicial ?? '')}" placeholder="15000" required>`,
        nuevo ? 'Lo que marca hoy el tablero. Se usa como punto de partida del plan de servicio.' : 'Punto de partida. El kilometraje actual se toma del último registro.')}
      <p class="form-error" id="err" role="alert"></p>
      <div class="sheet__actions">
        ${nuevo ? '<button type="button" class="btn btn--ghost" data-cerrar>Cancelar</button>' : '<button type="button" class="btn btn--ghost btn--danger-text" id="borrar">Eliminar</button>'}
        <button class="btn btn--primary">${nuevo ? 'Agregar vehículo' : 'Guardar cambios'}</button>
      </div>
    </form>`, (el) => {
    const f = el.querySelector('#f');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      if (!d.marca?.trim()) return mostrarError(el, 'Escribe la marca del vehículo.');
      if (d.kmInicial === '' || Number(d.kmInicial) < 0) return mostrarError(el, 'Escribe el kilometraje que marca el tablero.');
      const guardado = S.guardarVehiculo({
        ...(nuevo ? {} : { id: v.id }),
        tipo: nuevo ? d.tipo : v.tipo,
        nombre: d.nombre.trim(), marca: d.marca.trim(), modelo: d.modelo.trim(),
        anio: d.anio ? Number(d.anio) : '', placa: d.placa.trim().toUpperCase(),
        kmInicial: Number(d.kmInicial),
      });
      cerrarHoja();
      toast(nuevo ? 'Vehículo agregado' : 'Cambios guardados');
      if (nuevo) location.hash = `#/v/${guardado.id}`;
      else render();
    });
    el.querySelector('#borrar')?.addEventListener('click', async () => {
      const ok = await confirmar({
        titulo: '¿Eliminar este vehículo?',
        texto: 'Se borrarán también todos sus registros y su plan de servicio. Esta acción no se puede deshacer.',
        accion: 'Eliminar vehículo',
      });
      if (ok) {
        S.borrarVehiculo(v.id);
        toast('Vehículo eliminado');
        location.hash = '#/';
      }
    });
  });
}

function mostrarError(el, msg) {
  const e = el.querySelector('#err');
  e.textContent = msg;
  return false;
}

function formRegistro(vid, r) {
  const nuevo = !r;
  const v = S.vehiculo(vid);
  r = r || { tipo: 'combustible', fecha: S.hoyISO(), km: '', lleno: true, tareas: [] };
  const tareas = S.tareasDe(vid);
  const kmv = S.kmActual(vid);

  abrirHoja(`
    <h2 id="sheet-title" class="sheet__title">${nuevo ? 'Nuevo registro' : 'Editar registro'}</h2>
    <form id="f" novalidate>
      <fieldset class="seg">
        <legend class="field__label">¿Qué registras?</legend>
        ${Object.entries(S.TIPOS_REGISTRO).map(([k, t]) => `
          <label class="seg__opt">
            <input type="radio" name="tipo" value="${k}" ${r.tipo === k ? 'checked' : ''}>
            <span>${ICONO_TIPO[k]}${t.replace(' gasto', '')}</span>
          </label>`).join('')}
      </fieldset>
      <div class="grid2">
        ${campo('Fecha', `<input name="fecha" type="date" value="${esc(r.fecha)}" max="${S.hoyISO()}" required>`)}
        ${campo('Kilometraje', `<input name="km" type="number" inputmode="numeric" min="0" value="${esc(r.km)}" placeholder="${kmv}" required>`, nuevo ? `Último: ${km(kmv)}` : '')}
      </div>
      <div data-solo="combustible" class="grid2">
        ${campo(`Cantidad (${unidadVol()})`, `<input name="volumen" type="number" inputmode="decimal" step="0.01" min="0" value="${esc(r.volumen ?? '')}" placeholder="3.5">`)}
        <label class="check"><input type="checkbox" name="lleno" ${r.lleno ? 'checked' : ''}><span>Tanque lleno</span></label>
      </div>
      <fieldset data-solo="mantenimiento" class="checks">
        <legend class="field__label">¿Qué se hizo?</legend>
        ${tareas.length ? tareas.map((t) => `
          <label class="check"><input type="checkbox" name="tareas" value="${t.id}" ${(r.tareas || []).includes(t.id) ? 'checked' : ''}><span>${esc(t.nombre)}</span></label>`).join('')
          : '<p class="field__help">No hay tareas en el plan. Agrégalas en la pestaña Plan de servicio.</p>'}
      </fieldset>
      ${campo(`Costo (${S.ajustes().moneda})`, `<input name="costo" type="number" inputmode="decimal" step="0.01" min="0" value="${esc(r.costo ?? '')}" placeholder="0.00">`)}
      <div data-solo="mantenimiento reparacion">
        ${campo('Taller o lugar', `<input name="lugar" value="${esc(r.lugar)}" maxlength="60" placeholder="Opcional">`)}
      </div>
      ${campo('Notas', `<textarea name="notas" rows="2" maxlength="300" placeholder="Ej. Aceite 20W-50, cambio de pastillas delanteras">${esc(r.notas)}</textarea>`)}
      <p class="form-error" id="err" role="alert"></p>
      <div class="sheet__actions">
        ${nuevo ? '<button type="button" class="btn btn--ghost" data-cerrar>Cancelar</button>' : '<button type="button" class="btn btn--ghost btn--danger-text" id="borrar">Eliminar</button>'}
        <button class="btn btn--primary">${nuevo ? 'Guardar registro' : 'Guardar cambios'}</button>
      </div>
    </form>`, (el) => {
    const f = el.querySelector('#f');
    const sync = () => {
      const tipo = f.tipo.value;
      el.querySelectorAll('[data-solo]').forEach((x) => (x.hidden = !x.dataset.solo.split(' ').includes(tipo)));
    };
    f.querySelectorAll('[name=tipo]').forEach((x) => x.addEventListener('change', sync));
    sync();

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const tipo = f.tipo.value;
      const kmN = Number(f.km.value);
      if (!f.fecha.value) return mostrarError(el, 'Elige la fecha.');
      if (f.km.value === '' || kmN < 0) return mostrarError(el, 'Escribe el kilometraje que marcaba el tablero.');
      if (kmN < Number(v.kmInicial)) return mostrarError(el, `El kilometraje no puede ser menor que el inicial (${km(v.kmInicial)}).`);
      const seleccion = [...f.querySelectorAll('[name=tareas]:checked')].map((x) => x.value);
      if (tipo === 'combustible' && !(Number(f.volumen.value) > 0)) return mostrarError(el, `Escribe cuántos ${unidadVol() === 'L' ? 'litros' : 'galones'} cargaste.`);
      if (tipo === 'mantenimiento' && tareas.length && !seleccion.length) return mostrarError(el, 'Marca al menos una tarea realizada.');

      S.guardarRegistro({
        ...(nuevo ? {} : { id: r.id }),
        vehiculoId: vid, tipo, fecha: f.fecha.value, km: kmN,
        costo: Number(f.costo.value) || 0,
        volumen: tipo === 'combustible' ? Number(f.volumen.value) : undefined,
        lleno: tipo === 'combustible' ? f.lleno.checked : undefined,
        tareas: tipo === 'mantenimiento' ? seleccion : [],
        lugar: ['mantenimiento', 'reparacion'].includes(tipo) ? f.lugar.value.trim() : '',
        notas: f.notas.value.trim(),
      });
      cerrarHoja();
      toast(nuevo ? 'Registro guardado' : 'Cambios guardados');
      render();
    });
    el.querySelector('#borrar')?.addEventListener('click', async () => {
      if (await confirmar({ titulo: '¿Eliminar este registro?', texto: 'Se recalcularán el kilometraje, los gastos y el plan de servicio.', accion: 'Eliminar registro' })) {
        S.borrarRegistro(r.id);
        toast('Registro eliminado');
        render();
      }
    });
  });
}

function formTarea(vid, t) {
  const nueva = !t;
  t = t || { nombre: '', cadaKm: '', cadaMeses: '' };
  abrirHoja(`
    <h2 id="sheet-title" class="sheet__title">${nueva ? 'Agregar tarea' : 'Editar tarea'}</h2>
    <form id="f" novalidate>
      ${campo('Tarea', `<input name="nombre" value="${esc(t.nombre)}" placeholder="Ej. Cambio de kit de arrastre" maxlength="50" required autofocus>`)}
      <div class="grid2">
        ${campo('Cada (km)', `<input name="cadaKm" type="number" inputmode="numeric" min="0" step="50" value="${esc(t.cadaKm ?? '')}" placeholder="5000">`)}
        ${campo('Cada (meses)', `<input name="cadaMeses" type="number" inputmode="numeric" min="0" value="${esc(t.cadaMeses ?? '')}" placeholder="6">`)}
      </div>
      <p class="field__help">Llena uno o ambos. Si llenas los dos, te avisa con lo que llegue primero.</p>
      <p class="form-error" id="err" role="alert"></p>
      <div class="sheet__actions">
        ${nueva ? '<button type="button" class="btn btn--ghost" data-cerrar>Cancelar</button>' : '<button type="button" class="btn btn--ghost btn--danger-text" id="borrar">Quitar del plan</button>'}
        <button class="btn btn--primary">${nueva ? 'Agregar tarea' : 'Guardar cambios'}</button>
      </div>
    </form>`, (el) => {
    const f = el.querySelector('#f');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = f.nombre.value.trim();
      const cadaKm = Number(f.cadaKm.value) || null;
      const cadaMeses = Number(f.cadaMeses.value) || null;
      if (!nombre) return mostrarError(el, 'Escribe el nombre de la tarea.');
      if (!cadaKm && !cadaMeses) return mostrarError(el, 'Indica cada cuántos km o cada cuántos meses se hace.');
      S.guardarTarea({ ...(nueva ? {} : { id: t.id }), vehiculoId: vid, nombre, cadaKm, cadaMeses });
      cerrarHoja();
      toast(nueva ? 'Tarea agregada' : 'Cambios guardados');
      render();
    });
    el.querySelector('#borrar')?.addEventListener('click', async () => {
      if (await confirmar({ titulo: '¿Quitar esta tarea?', texto: 'Los registros anteriores se conservan, pero ya no aparecerá en el plan.', accion: 'Quitar del plan' })) {
        S.borrarTarea(t.id);
        toast('Tarea quitada');
        render();
      }
    });
  });
}

function formAjustes() {
  const a = S.ajustes();
  abrirHoja(`
    <h2 id="sheet-title" class="sheet__title">Ajustes y respaldo</h2>
    <form id="f">
      <fieldset class="seg">
        <legend class="field__label">Combustible en</legend>
        <label class="seg__opt"><input type="radio" name="volumen" value="gal" ${a.volumen !== 'L' ? 'checked' : ''}><span>Galones</span></label>
        <label class="seg__opt"><input type="radio" name="volumen" value="L" ${a.volumen === 'L' ? 'checked' : ''}><span>Litros</span></label>
      </fieldset>
      ${campo('Moneda', `<input name="moneda" value="${esc(a.moneda)}" maxlength="4">`)}
    </form>
    <div class="backup">
      <h3 class="backup__title">Respaldo</h3>
      <p class="field__help">Tus datos viven solo en este navegador. Descarga un respaldo de vez en cuando, o úsalo para pasar tu bitácora a otro celular.</p>
      <div class="sheet__actions">
        <button type="button" class="btn btn--ghost" id="exp">Descargar respaldo</button>
        <label class="btn btn--ghost">Restaurar respaldo<input type="file" id="imp" accept="application/json,.json" hidden></label>
      </div>
    </div>
    <div class="sheet__actions">
      <button type="button" class="btn btn--primary btn--block" data-cerrar>Listo</button>
    </div>`, (el) => {
    const f = el.querySelector('#f');
    f.addEventListener('change', () => {
      S.guardarAjustes({ volumen: f.volumen.value, moneda: f.moneda.value.trim() || 'S/' });
      render();
    });
    el.querySelector('#exp').addEventListener('click', () => {
      const blob = new Blob([S.exportar()], { type: 'application/json' });
      const a2 = document.createElement('a');
      a2.href = URL.createObjectURL(blob);
      a2.download = `bitacora-respaldo-${S.hoyISO()}.json`;
      a2.click();
      setTimeout(() => URL.revokeObjectURL(a2.href), 1000);
      toast('Respaldo descargado');
    });
    el.querySelector('#imp').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await confirmar({ titulo: '¿Restaurar este respaldo?', texto: 'Reemplazará todos los datos actuales de este dispositivo.', accion: 'Restaurar' });
      if (!ok) return;
      try {
        S.importar(await file.text());
        toast('Respaldo restaurado');
        location.hash = '#/';
        render();
      } catch (err) {
        toast(err.message || 'No se pudo leer el archivo.');
      }
    });
  });
}

// ---------- Inicio ----------

render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
navigator.storage?.persist?.().catch(() => {});
