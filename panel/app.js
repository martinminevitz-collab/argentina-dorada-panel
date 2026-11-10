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
function leerPublicados() {
  try { return JSON.parse(localStorage.getItem("ad-publicados") || "{}"); } catch { return {}; }
}
function guardarPublicados() {
  try { localStorage.setItem("ad-publicados", JSON.stringify(estado.publicados)); } catch {}
}
// publicado = lo marcaste vos, o está en gris en el Doc
function estaPublicado(e) { return e.publicado_en_doc || e.id in estado.publicados; }
function tieneNovedades(e) { return e.id in estado.publicados && estado.publicados[e.id] !== e.version; }

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

function eventosDe(tab, conFiltros = true) {
  const seccion = tab === "agenda" ? "agenda" : "resultados";
  return estado.eventos.filter((e) => {
    if (e.seccion !== seccion) return false;
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
function dibujar() {
  for (const b of document.querySelectorAll(".pestanas button")) {
    const t = b.dataset.tab;
    b.classList.toggle("activa", t === estado.tab);
    const n = t === "radar" ? estado.noticias.length : eventosDe(t, false).length;
    b.querySelector(".n").textContent = n || "";
  }
  document.querySelectorAll("[data-para]").forEach((el) => (el.hidden = !el.dataset.para.split(" ").includes(estado.tab)));

  const lista = $("#lista");
  lista.innerHTML = "";
  if (estado.tab === "radar") return dibujarRadar(lista);

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

  const pub = estaPublicado(e) && !tieneNovedades(e);
  t.classList.toggle("ya-publicado", pub);
  const bPub = t.querySelector(".publicado");
  bPub.textContent = pub ? "✓ Publicado" : "Publicado";
  bPub.classList.toggle("marcado", pub);
  bPub.disabled = e.publicado_en_doc && !(e.id in estado.publicados);
  if (bPub.disabled) bPub.title = "Ya figura como publicado (en gris) en el Doc";
  bPub.onclick = () => {
    if (e.id in estado.publicados && estado.publicados[e.id] === e.version) delete estado.publicados[e.id];
    else estado.publicados[e.id] = e.version;
    guardarPublicados(); dibujar();
    avisar(e.id in estado.publicados ? "Marcado como publicado" : "Desmarcado");
  };
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
cargar();
