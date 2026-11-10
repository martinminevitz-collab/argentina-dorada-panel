// Panel Argentina Dorada
// - Resultados y Agenda: salen del Doc "Resultados desde Claude" (data/doc-resultados.json).
// - Radar del bot: noticias sueltas que junta el bot (data/hallazgos/...).
// "Publicado" se guarda en este dispositivo. Cuando se sume la base compartida, se sincroniza con todos.

const DATA = "data/";
const $ = (s) => document.querySelector(s);
const ETIQUETAS = {
  publicable: "Publicable", en_curso: "En curso", mas_info: "Falta info", agenda: "Agenda",
};
const estado = {
  tab: "resultados", eventos: [], noticias: [], doc: null, corrida: {},
  filtroEstado: "", filtroTipo: "", abiertos: new Set(), publicados: leerPublicados(),
};

// ---------- guardado local ----------
// Sin base compartida: en este dispositivo. Con base: en Supabase (lo ven todos). Ver base.js
function leerPublicados() {
  try {
    const d = JSON.parse(localStorage.getItem("ad-publicados") || "{}");
    // formato viejo {id: version} -> {id: {v}}
    for (const k in d) if (typeof d[k] === "string") d[k] = { v: d[k] };
    return d;
  } catch { return {}; }
}
function guardarPublicados() {
  if (window.Base?.activa()) return;
  try { localStorage.setItem("ad-publicados", JSON.stringify(estado.publicados)); } catch {}
}
// publicado = lo marcó alguien, o está en gris en el Doc
function estaPublicado(e) { return e.publicado_en_doc || e.id in estado.publicados; }
function tieneNovedades(e) { return e.id in estado.publicados && estado.publicados[e.id].v !== e.version; }

// ---------- carga ----------
async function bajarJSON(ruta) {
  const r = await fetch(DATA + ruta + "?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error(ruta + " → " + r.status);
  return r.json();
}

async function cargar() {
  $("#recargar").classList.add("girando");
  try {
    const [doc, corrida, indice] = await Promise.all([
      bajarJSON("doc-resultados.json").catch(() => null),
      bajarJSON("ultima-corrida.json").catch(() => ({})),
      bajarJSON("indice.json").catch(() => ({ dias: [] })),
    ]);
    estado.doc = doc; estado.corrida = corrida;
    estado.eventos = doc?.eventos || [];
    const dias = Number($("#rango").value);
    const listas = await Promise.all(indice.dias.slice(0, dias).map((d) => bajarJSON(d.archivo).catch(() => [])));
    estado.noticias = listas.flat();
  } finally {
    $("#recargar").classList.remove("girando");
  }
  mostrarEstado(); llenarDeportes(); dibujar();
}

function haceCuanto(iso) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

function mostrarEstado() {
  const r = estado.corrida.resultados;
  const partes = [];
  if (estado.doc) partes.push(`<span class="ok">●</span> <b>Doc</b> actualizado ${escapar(estado.doc.actualizado_doc || "")}`);
  else partes.push(`<span class="mal">●</span> Todavía no se leyó el Doc`);
  if (r) partes.push(`<span class="ok">●</span> <b>Bot</b> corrió ${haceCuanto(r.cuando)} · ${r.nuevos} noticias nuevas`);
  $("#estado").innerHTML = partes.join("<br>");
}

function llenarDeportes() {
  const sel = $("#deporte"), actual = sel.value;
  const fuente = estado.tab === "radar" ? estado.noticias.map((n) => n.deporte) : estado.eventos.map((e) => e.deporte);
  const deportes = [...new Set(fuente.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  sel.innerHTML = `<option value="">Todos los deportes</option>` + deportes.map((d) => `<option>${escapar(d)}</option>`).join("");
  sel.value = deportes.includes(actual) ? actual : "";
}

// ---------- filtros ----------
function textoEvento(e) {
  return [e.titulo, ...e.bloques.flatMap((b) => (b.partes || []).map((p) => p.t))].join(" ").toLowerCase();
}

// En Resultados: primero lo Publicable, después En curso y al final Falta info.
// Dentro de cada grupo se respeta el orden del Doc. La Agenda queda por fecha (como en el Doc).
const ORDEN = { publicable: 0, en_curso: 1, mas_info: 2 };

function eventosDe(tab, conFiltros = true) {
  const seccion = tab === "agenda" ? "agenda" : "resultados";
  const lista = estado.eventos.map((e, i) => ({ e, i }));
  if (seccion === "resultados") lista.sort((a, b) => (ORDEN[a.e.etiqueta] ?? 9) - (ORDEN[b.e.etiqueta] ?? 9) || a.i - b.i);
  return lista.map((x) => x.e).filter((e) => {
    if (e.seccion !== seccion) return false;
    if (seccion === "resultados" && e.multideportivo) return false;
    if (!conFiltros) return !estaPublicado(e) || tieneNovedades(e);
    if (!$("#ver-publicados").checked && estaPublicado(e) && !tieneNovedades(e)) return false;
    if (tab === "resultados" && estado.filtroEstado && e.etiqueta !== estado.filtroEstado) return false;
    const dep = $("#deporte").value;
    if (dep && e.deporte !== dep) return false;
    const q = $("#buscar").value.trim().toLowerCase();
    if (q && !textoEvento(e).includes(q)) return false;
    return true;
  });
}

function noticiasFiltradas(conFiltros = true) {
  return estado.noticias.filter((n) => {
    if (!conFiltros) return true;
    const t = estado.filtroTipo;
    if (t === "ba" ? !n.en_buenos_aires : t && n.tipo !== t) return false;
    const dep = $("#deporte").value;
    if (dep && n.deporte !== dep) return false;
    const q = $("#buscar").value.trim().toLowerCase();
    if (q && !`${n.titulo} ${n.resumen} ${n.fuente}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

// ---------- dibujo ----------
function multiActivos() { return estado.eventos.filter((e) => e.multideportivo && e.seccion === "resultados"); }
function multiProximo() { return estado.eventos.find((e) => e.multideportivo && e.seccion === "agenda"); }

function pestanasMulti() {
  const caja = $("#tabs-multi");
  const activos = multiActivos();
  const tabs = activos.map((e) => ({ tab: "m:" + e.id, txt: e.multi.nombre, en_vivo: true }));
  if (!activos.length && multiProximo()) tabs.push({ tab: "m:prox", txt: "Próximamente" });
  caja.innerHTML = tabs.map((t) =>
    `<button role="tab" data-tab="${t.tab}" class="multi">${t.en_vivo ? '<span class="vivo">●</span> ' : ""}${escapar(t.txt)} <span class="n"></span></button>`).join("");
  caja.querySelectorAll("button").forEach((b) => (b.onclick = () => { estado.tab = b.dataset.tab; llenarDeportes(); dibujar(); window.scrollTo({ top: 0 }); }));
  // si la pestaña elegida ya no existe (terminó el evento), volvemos a Resultados
  if (estado.tab.startsWith("m:") && !tabs.some((t) => t.tab === estado.tab)) estado.tab = "resultados";
  if (!estado.eligioTab && tabs[0]?.en_vivo) { estado.tab = tabs[0].tab; estado.eligioTab = true; }
}

function dibujar() {
  pestanasMulti();
  const esMulti = estado.tab.startsWith("m:");
  for (const b of document.querySelectorAll(".pestanas button")) {
    const t = b.dataset.tab;
    b.classList.toggle("activa", t === estado.tab);
    const n = t === "radar" ? estado.noticias.length : t.startsWith("m:") ? "" : eventosDe(t, false).length;
    b.querySelector(".n").textContent = n || "";
  }
  document.querySelectorAll("[data-para]").forEach((el) => (el.hidden = !el.dataset.para.split(" ").includes(estado.tab)));
  document.querySelector(".filtros").hidden = esMulti;

  const lista = $("#lista");
  lista.innerHTML = "";
  lista.classList.remove("modo-multi");
  if (estado.tab === "radar") return dibujarRadar(lista);
  if (esMulti) return dibujarMulti(lista);

  const eventos = eventosDe(estado.tab);
  if (!estado.doc) { lista.innerHTML = `<p class="vacio">Todavía no se leyó el Doc. Se carga solo en la próxima vuelta del bot.</p>`; return; }
  if (!eventos.length) { lista.innerHTML = `<p class="vacio">Nada por acá. Probá con "Todos" o tildá "Mostrar los que ya publiqué".</p>`; return; }
  const tpl = $("#tpl-evento");
  for (const e of eventos) lista.append(tarjetaEvento(e, tpl));
}

function tarjetaEvento(e, tpl) {
  const t = tpl.content.firstElementChild.cloneNode(true);
  const dep = t.querySelector(".deporte");
  dep.textContent = e.deporte; dep.hidden = !e.deporte;
  const et = t.querySelector(".etiqueta");
  et.textContent = ETIQUETAS[e.etiqueta] || e.etiqueta; et.classList.add(e.etiqueta);
  t.querySelector(".novedad").hidden = !tieneNovedades(e);
  t.querySelector(".titulo").textContent = e.evento || e.titulo;
  const f = t.querySelector(".fechas"); f.textContent = e.fechas || ""; f.hidden = !e.fechas;

  const abierto = estado.abiertos.has(e.id);
  const cabeza = t.querySelector(".cabeza"), detalle = t.querySelector(".detalle");
  cabeza.setAttribute("aria-expanded", abierto);
  t.classList.toggle("abierto", abierto);
  if (abierto) { detalle.hidden = false; detalle.append(...renderBloques(e.bloques)); }
  cabeza.onclick = () => {
    estado.abiertos.has(e.id) ? estado.abiertos.delete(e.id) : estado.abiertos.add(e.id);
    t.replaceWith(tarjetaEvento(e, tpl));
  };

  configurarPublicado(t.querySelector(".publicado"), t, e);
  t.querySelector(".copiar").onclick = () => copiarEvento(e);
  return t;
}

const MESES = /\(Creo\)/g;
function renderPartes(partes, destino) {
  for (const p of partes) {
    let nodo;
    if (p.href) {
      nodo = document.createElement("a");
      nodo.href = p.href; nodo.target = "_blank"; nodo.rel = "noopener";
      nodo.textContent = nombreLink(p.href);
      nodo.className = "link-en-texto";
    } else {
      nodo = document.createElement(p.b ? "strong" : "span");
      // "(Creo)" se resalta para que salte a la vista
      const trozos = p.t.split(MESES);
      trozos.forEach((tr, i) => {
        nodo.append(tr);
        if (i < trozos.length - 1) { const c = document.createElement("em"); c.className = "creo"; c.textContent = "(Creo)"; nodo.append(c); }
      });
    }
    if (p.c) nodo.classList.add("c-" + p.c);
    destino.append(nodo);
  }
}

function renderBloques(bloques) {
  const out = [];
  let links = null;
  for (const b of bloques) {
    if (b.tipo === "link") {
      // los links seguidos se agrupan en una fila de botoncitos: "Resultado · afa.com.ar"
      if (!links) { links = document.createElement("div"); links.className = "links"; out.push(links); }
      const href = b.partes.find((p) => p.href)?.href;
      const resto = b.partes.filter((p) => !p.href).map((p) => p.t).join("").trim().replace(/^\(|\)$/g, "");
      const a = document.createElement("a");
      a.href = href; a.target = "_blank"; a.rel = "noopener"; a.className = "link-fuente";
      a.innerHTML = `<b>${escapar(resto || "Link")}</b> <span>${escapar(nombreLink(href))}</span>`;
      links.append(a);
      continue;
    }
    links = null;
    if (b.tipo === "espacio") { const d = document.createElement("div"); d.className = "espacio"; out.push(d); continue; }
    const el = document.createElement(b.tipo === "sub" ? "h4" : "p");
    renderPartes(b.partes, el);
    out.push(el);
  }
  return out;
}

function nombreLink(href) {
  try {
    const u = new URL(href);
    const dom = u.hostname.replace(/^www\./, "");
    if (dom === "instagram.com") return "@" + u.pathname.split("/").filter(Boolean)[0];
    return dom;
  } catch { return "link"; }
}

// ---------- copiar ----------
function textoPlano(e) {
  const lineas = [e.titulo + (e.etiqueta === "publicable" ? " PUBLICABLE" : "")];
  for (const b of e.bloques) {
    if (b.tipo === "espacio") lineas.push("");
    else lineas.push(b.partes.map((p) => p.t).join("").trim());
  }
  return lineas.join("\n");
}
function textoHTML(e) {
  const esc = (s) => escapar(s);
  const partes = (ps) => ps.map((p) => {
    let s = esc(p.t);
    if (p.href) s = `<a href="${esc(p.href)}">${s}</a>`;
    if (p.b) s = `<b>${s}</b>`;
    if (p.c === "rojo") s = `<span style="color:#ff0000">${s}</span>`;
    if (p.c === "gris") s = `<span style="color:#999999">${s}</span>`;
    return s;
  }).join("");
  let h = `<p><b style="color:#ff0000">${esc(e.titulo)}</b>${e.etiqueta === "publicable" ? ' <b style="color:#0000ff">PUBLICABLE</b>' : ""}</p>`;
  for (const b of e.bloques) h += b.tipo === "espacio" ? "<p><br></p>" : `<p>${partes(b.partes)}</p>`;
  return `<div style="font-family:Arial;font-size:11pt">${h}</div>`;
}
async function copiarEvento(e) {
  try {
    if (window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({
        "text/plain": new Blob([textoPlano(e)], { type: "text/plain" }),
        "text/html": new Blob([textoHTML(e)], { type: "text/html" }),
      })]);
    } else {
      await navigator.clipboard.writeText(textoPlano(e));
    }
    avisar("Copiado");
  } catch { avisar("No se pudo copiar"); }
}

// ---------- multideportivos (Dakar 2026, Lima 2027…) ----------
function dibujarMulti(lista) {
  lista.classList.add("modo-multi");
  if (estado.tab === "m:prox") {
    const e = multiProximo();
    lista.innerHTML = `<section class="multi-cab"><p class="chip agenda">Próximo multideportivo</p>
      <h2>${escapar(e.multi.nombre)}</h2><p class="fechas">${escapar(e.fechas || "")}</p>
      <p class="ayuda">Cuando arranque, acá va a aparecer el día a día.</p></section>`;
    if (e.bloques.length) { const d = document.createElement("div"); d.className = "detalle suelto"; d.append(...renderBloques(e.bloques)); lista.append(d); }
    return;
  }
  const e = estado.eventos.find((x) => "m:" + x.id === estado.tab);
  const m = e.multi;
  const vista = estado.multiVista || (m.dias.length ? "dia" : "deporte");

  const cab = document.createElement("section");
  cab.className = "multi-cab";
  cab.innerHTML = `<div class="chips"><span class="chip ${e.etiqueta}">${ETIQUETAS[e.etiqueta]}</span></div>
    <h2>${escapar(m.nombre)}</h2><p class="fechas">${escapar(e.fechas || "")}</p>`;
  if (m.medallero) { const p = document.createElement("p"); p.className = "medallero"; renderPartes(m.medallero, p); cab.append(p); }
  const sw = document.createElement("div");
  sw.className = "chips-filtro";
  sw.innerHTML = `<button data-v="dia">Por día</button><button data-v="deporte">Por deporte</button>`;
  sw.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("activo", b.dataset.v === vista);
    b.onclick = () => { estado.multiVista = b.dataset.v; estado.multiSel = null; dibujar(); };
  });
  cab.append(sw);
  lista.append(cab);

  if (m.general.length) { const g = cajaMulti(e, "general", "Info general", m.general, { cerrada: true, sinPublicar: true }); g.classList.add("info-general"); lista.append(g); }

  if (vista === "dia") {
    if (!m.dias.length) {
      lista.append(Object.assign(document.createElement("p"), { className: "vacio",
        textContent: "El agente empieza a ordenar este evento día por día desde su próxima vuelta. Mientras tanto, mirá 'Por deporte'." }));
      return;
    }
    const sel = m.dias.find((d) => d.titulo === estado.multiSel) || m.dias[0];
    lista.append(selector(m.dias.map((d) => d.titulo), sel.titulo, (t) => t.replace(/^D[IÍ]A\s*/i, "Día ")));
    const r = sel.resumen;
    if (r.destacados.length || r.posteo) lista.append(cajaResumen(e, sel));
    else lista.append(Object.assign(document.createElement("p"), { className: "ayuda pendiente", textContent: "El resumen del día aparece cuando termina la jornada." }));
    for (const dep of sel.deportes) lista.append(cajaMulti(e, sel.titulo + "|" + dep.nombre, dep.nombre, dep.bloques, { sub: sel.titulo }));
  } else {
    if (!m.deportes.length) { lista.append(Object.assign(document.createElement("p"), { className: "vacio", textContent: "Todavía no hay deportes cargados." })); return; }
    const sel = m.deportes.find((d) => d.nombre === estado.multiSel) || m.deportes[0];
    lista.append(selector(m.deportes.map((d) => d.nombre), sel.nombre));
    for (const d of sel.dias) lista.append(cajaMulti(e, (d.dia || "") + "|" + sel.nombre, d.dia ? d.dia.replace(/^D[IÍ]A\s*/i, "Día ") : sel.nombre, d.bloques, { sub: sel.nombre }));
  }
}

function selector(opciones, actual, etiqueta = (x) => x) {
  const d = document.createElement("div");
  d.className = "selector";
  for (const o of opciones) {
    const b = document.createElement("button");
    b.textContent = etiqueta(o);
    b.classList.toggle("activo", o === actual);
    b.onclick = () => { estado.multiSel = o; dibujar(); };
    d.append(b);
  }
  return d;
}

// cada recuadro (un deporte en un día) es como un mini evento: se copia y se marca Publicado por separado
function cajaMulti(e, clave, titulo, bloques, { sub = "", cerrada = false, sinPublicar = false } = {}) {
  const id = e.id + ":" + clave;
  const mini = { id, titulo: `${e.multi.nombre.toUpperCase()} - ${titulo.toUpperCase()}${sub && !/^d[ií]a/i.test(titulo) ? "" : ""}`,
    evento: titulo, deporte: sub && !/^d[ií]a/i.test(sub) ? "" : "", etiqueta: "multi", bloques,
    version: huella(JSON.stringify(bloques)), publicado_en_doc: bloques.length > 0 && bloques.every((b) => !b.partes || b.partes.every((p) => p.c === "gris")) };
  const t = $("#tpl-evento").content.firstElementChild.cloneNode(true);
  t.classList.add("caja-multi");
  t.querySelector(".deporte").hidden = true;
  t.querySelector(".etiqueta").hidden = true;
  t.querySelector(".novedad").hidden = !tieneNovedades(mini);
  t.querySelector(".titulo").textContent = titulo;
  t.querySelector(".fechas").hidden = true;
  const abierto = cerrada ? estado.abiertos.has(id) : !estado.cerrados?.has(id);
  const det = t.querySelector(".detalle");
  t.classList.toggle("abierto", abierto);
  if (abierto) { det.hidden = false; det.append(...renderBloques(bloques)); }
  t.querySelector(".cabeza").onclick = () => {
    if (cerrada) estado.abiertos.has(id) ? estado.abiertos.delete(id) : estado.abiertos.add(id);
    else { estado.cerrados ??= new Set(); estado.cerrados.has(id) ? estado.cerrados.delete(id) : estado.cerrados.add(id); }
    dibujar();
  };
  t.querySelector(".copiar").onclick = () => copiarEvento(mini);
  const bPub = t.querySelector(".publicado");
  if (sinPublicar) bPub.remove(); else configurarPublicado(bPub, t, mini);
  return t;
}

function cajaResumen(e, dia) {
  const t = document.createElement("article");
  t.className = "evento resumen-dia abierto";
  t.innerHTML = `<div class="cabeza-fija"><span class="chip publicable">Resumen del día</span><span class="titulo">${escapar(dia.titulo)}</span></div>`;
  const det = document.createElement("div");
  det.className = "detalle";
  if (dia.resumen.destacados.length) { const h = document.createElement("h4"); h.textContent = "Destacados"; det.append(h, ...renderBloques(dia.resumen.destacados)); }
  if (dia.resumen.posteo) {
    const h = document.createElement("h4"); h.textContent = "Para el posteo";
    const p = document.createElement("p"); p.className = "posteo"; p.textContent = dia.resumen.posteo;
    det.append(h, p);
  }
  t.append(det);
  const pie = document.createElement("div");
  pie.className = "pie";
  const mini = { id: e.id + ":resumen:" + dia.titulo, titulo: `${e.multi.nombre.toUpperCase()} - RESUMEN ${dia.titulo}`, etiqueta: "multi",
    bloques: dia.resumen.destacados, version: huella(JSON.stringify(dia.resumen)) };
  if (dia.resumen.posteo) pie.append(boton("Copiar posteo", async () => {
    try { await navigator.clipboard.writeText(dia.resumen.posteo); avisar("Posteo copiado"); } catch { avisar("No se pudo copiar"); }
  }));
  pie.append(boton("Copiar destacados", () => copiarEvento(mini)));
  const bPub = boton("Publicado", null); bPub.className = "publicado";
  pie.append(bPub);
  configurarPublicado(bPub, t, mini);
  t.append(pie);
  return t;
}

function configurarPublicado(bPub, t, e) {
  const pub = estaPublicado(e) && !tieneNovedades(e);
  t.classList.toggle("ya-publicado", pub);
  const marca = estado.publicados[e.id];
  bPub.textContent = pub ? "✓ Publicado" : "Publicado";
  if (marca?.por) bPub.title = `Lo marcó ${marca.por}`;
  bPub.classList.toggle("marcado", pub);
  bPub.disabled = e.publicado_en_doc && !(e.id in estado.publicados);
  if (bPub.disabled) bPub.title = "Ya figura como publicado (en gris) en el Doc";
  bPub.onclick = async () => {
    const desmarcar = e.id in estado.publicados && estado.publicados[e.id].v === e.version;
    const antes = estado.publicados[e.id];
    if (desmarcar) delete estado.publicados[e.id];
    else estado.publicados[e.id] = { v: e.version, por: window.Base?.mail() };
    guardarPublicados(); dibujar();
    try {
      if (window.Base?.activa()) await (desmarcar ? Base.desmarcar(e) : Base.marcar(e));
      avisar(desmarcar ? "Desmarcado" : "Marcado como publicado");
    } catch (err) {
      if (antes) estado.publicados[e.id] = antes; else delete estado.publicados[e.id];
      dibujar(); avisar("No se pudo guardar. Probá de nuevo");
    }
  };
}

function boton(txt, fn) { const b = document.createElement("button"); b.textContent = txt; if (fn) b.onclick = fn; return b; }

function huella(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

// ---------- radar ----------
function dibujarRadar(lista) {
  const items = noticiasFiltradas();
  if (!items.length) { lista.innerHTML = `<p class="vacio">Nada por acá.</p>`; return; }
  const tpl = $("#tpl-noticia");
  for (const n of items) {
    const t = tpl.content.firstElementChild.cloneNode(true);
    t.querySelector(".deporte").textContent = n.deporte;
    const tipo = t.querySelector(".tipo");
    tipo.textContent = { resultado: "Resultado", agenda: "Agenda", otro: "Otro" }[n.tipo] || n.tipo;
    tipo.classList.add(n.tipo);
    t.querySelector(".ba").hidden = !n.en_buenos_aires;
    const a = t.querySelector("h2 a"); a.href = n.link; a.textContent = n.titulo;
    t.querySelector(".meta").textContent = `${n.fuente || ""} · ${haceCuanto(n.publicado || n.encontrado)}`;
    lista.append(t);
  }
}

// ---------- varios ----------
function avisar(txt) {
  const a = $("#aviso"); a.textContent = txt; a.hidden = false;
  clearTimeout(avisar.t); avisar.t = setTimeout(() => (a.hidden = true), 1600);
}
function escapar(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function chips(id, clave) {
  $(id).querySelectorAll("button").forEach((b) => (b.onclick = () => {
    estado[clave] = b.dataset.v;
    $(id).querySelectorAll("button").forEach((x) => x.classList.toggle("activo", x === b));
    dibujar();
  }));
}
chips("#filtro-estado", "filtroEstado");
chips("#filtro-tipo", "filtroTipo");
document.querySelectorAll(".pestanas button").forEach((b) => (b.onclick = () => {
  estado.tab = b.dataset.tab; llenarDeportes(); dibujar(); window.scrollTo({ top: 0 });
}));
["#buscar", "#deporte", "#ver-publicados"].forEach((s) => $(s).addEventListener("input", dibujar));
$("#rango").addEventListener("change", cargar);
$("#recargar").onclick = cargar;
document.addEventListener("visibilitychange", () => { if (!document.hidden) cargar(); });

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
// la base compartida avisa cuando cambian los publicados (de este u otro dispositivo)
window.alCambiarPublicados = (mapa) => { estado.publicados = mapa ?? leerPublicados(); dibujar(); };
window.Base?.iniciar();
cargar();
