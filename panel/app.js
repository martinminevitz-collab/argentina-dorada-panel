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
    const [doc, corrida, indice, medalleros, manuales, agregados, ba, archivo, insta, modeloAcred] = await Promise.all([
      bajarJSON("doc-resultados.json").catch(() => null),
      bajarJSON("ultima-corrida.json").catch(() => ({})),
      bajarJSON("indice.json").catch(() => ({ dias: [] })),
      bajarJSON("medalleros.json").catch(() => ({})),
      bajarJSON("eventos-manuales.json").catch(() => ({ pendientes: [] })),
      bajarJSON("agregados.json").catch(() => ({ pendientes: [] })),
      bajarJSON("eventos-ba.json").catch(() => ({ eventos: [], lugares: [] })),
      bajarJSON("doc-archivo.json").catch(() => ({ eventos: {} })),
      bajarJSON("instagram.json").catch(() => ({ cuentas: {} })),
      bajarJSON("acreditacion.json").catch(() => ({})),
    ]);
    estado.archivo = Object.values(archivo.eventos || {});
    estado.modeloAcred = modeloAcred;
    estado.instagram = Object.entries(insta.cuentas || {}).sort((a, b) => b[0].length - a[0].length);
    estado.agregadosBot = agregados.pendientes || [];
    estado.ba = ba;
    estado.manualesBot = manuales.pendientes || [];
    estado.medalleros = medalleros;
    estado.doc = doc; estado.corrida = corrida;
    estado.docEventos = doc?.eventos || [];
    combinar();
    const listas = await Promise.all(indice.dias.slice(0, 7).map((d) => bajarJSON(d.archivo).catch(() => [])));
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
  const fuente = estado.tab === "radar" || estado.tab === "noticias" ? estado.noticias.map((n) => n.deporte) : estado.eventos.map((e) => e.deporte);
  const deportes = [...new Set(fuente.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  sel.innerHTML = `<option value="">Todos los deportes</option>` + deportes.map((d) => `<option>${escapar(d)}</option>`).join("");
  sel.value = deportes.includes(actual) ? actual : "";
}

// ---------- eventos cargados a mano ("+ Crear evento") ----------
// Viven en la base compartida. Si no estás logueado, se ven igual con la copia que guarda el bot.
// Cuando el agente los pasa al Doc (línea "Ref panel: xxxxxxxx"), el del panel desaparece y queda el del Doc.
function refDe(fila) { return fila.ref || String(fila.id).replace(/-/g, "").slice(0, 8); }

function partesConNegrita(linea) {
  // **negrita** y links (https://...) clickeables
  return linea.split(/\*\*/).flatMap((t, i) => t.split(/(https?:\/\/[^\s)]+)/).map((x, j) => (j % 2 ? { t: x, href: x } : i % 2 ? { t: x, b: true } : { t: x })))
    .filter((p) => p.t);
}

function aEvento(f) {
  const bloques = [];
  if (f.link) bloques.push({ tipo: "link", partes: [{ t: f.link, href: f.link }, { t: " (Fuente)" }] });
  for (const linea of String(f.detalle || "").split("\n")) {
    const l = linea.trim();
    if (!l) { if (bloques.length && bloques.at(-1).tipo !== "espacio") bloques.push({ tipo: "espacio" }); continue; }
    bloques.push({ tipo: /^\*\*[^*]+\*\*:?$/.test(l) ? "sub" : "texto", partes: partesConNegrita(l) });
  }
  const ref = refDe(f);
  return { id: "manual:" + ref, ref, idBase: f.id && f.id.includes("-") ? f.id : null, manual: true,
    titulo: f.titulo, evento: f.titulo, deporte: f.deporte || "", seccion: f.seccion,
    etiqueta: f.seccion === "agenda" ? "agenda" : (f.estado || "en_curso"),
    fechas: [f.fechas, f.lugar].filter(Boolean).join(" · "), bloques, version: huella(JSON.stringify(f)) };
}

function combinar() {
  const doc = estado.docEventos || [];
  const refs = new Set(doc.flatMap((e) => e.refs_panel || []));
  const filas = estado.manualesBase ?? estado.manualesBot ?? [];
  const manuales = filas.map(aEvento).filter((m) => !refs.has(m.ref));
  // datos agregados desde el panel ("+ Agregar dato"): se suman al final del evento hasta que el agente los pasa al Doc
  const todos = (estado.agregadosBase ?? estado.agregadosBot ?? []).filter((a) => !refs.has(refDe(a)));
  // marcas especiales (se guardan como "correccion" con [ELIMINAR] / [PUBLICABLE] adelante: no hace falta tocar la base)
  const esMarca = (a, m) => a.tipo === m.toLowerCase() || String(a.texto || "").startsWith(`[${m}]`);
  const ags = todos.filter((a) => !esMarca(a, "ELIMINAR") && !esMarca(a, "PUBLICABLE"));
  const bajas = todos.filter((a) => esMarca(a, "ELIMINAR")); // "🗑 Eliminar": se oculta para todos y el agente lo saca del Doc
  const listos = todos.filter((a) => esMarca(a, "PUBLICABLE")); // "Falta info" que ya completaron: pasa a Publicable
  // lo que el agente ya sacó del Doc por publicado: queda 7 días para "Mostrar los que ya publiqué"
  const enDoc = new Set(doc.map((e) => e.id));
  const archivados = (estado.archivo || []).filter((e) => !enDoc.has(e.id)).map((e) => ({ ...e, publicado_en_doc: true, archivado: true }));
  const esDe = (a, e) => a.evento_id === e.id || sinTildes(a.evento_titulo) === sinTildes(e.titulo);
  estado.eventos = [...manuales, ...doc, ...archivados].map((e) => {
    const baja = bajas.find((a) => esDe(a, e));
    if (baja) e = { ...e, eliminado: { idBase: String(baja.id || "").includes("-") ? baja.id : null } };
    const listo = e.etiqueta === "mas_info" && listos.find((a) => esDe(a, e));
    if (listo) e = { ...e, etiqueta: "publicable", pasadoAPublicable: { idBase: String(listo.id || "").includes("-") ? listo.id : null } };
    const mios = ags.filter((a) => esDe(a, e));
    if (!mios.length) return e;
    return { ...e, version: e.version + ":" + huella(mios.map((a) => a.texto).join("|")),
      bloques: [...e.bloques, ...mios.map((a) => ({ tipo: "texto", agregado: true, idBase: String(a.id || "").includes("-") ? a.id : null,
        partes: partesConNegrita((a.tipo === "correccion" ? "Corrección: " : "") + a.texto) }))] };
  });
}

function sinTildes(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim(); }

// ---------- agregar un dato a un evento ----------
estado.borradorDato = {};
function cajaAgregarDato(e, t) {
  const caja = document.createElement("div");
  caja.className = "agregar-dato";
  if (e.archivado) return caja; // ya se publicó y salió del Doc: no tiene dónde ir el dato
  const abierto = estado.agregandoEn === e.id;
  if (!abierto) {
    caja.append(boton("+ Agregar dato", () => {
      if (!window.Base?.activa()) return avisar("Entrá con tu mail (arriba a la izquierda) para agregar datos");
      estado.agregandoEn = e.id; t.replaceWith(tarjetaEvento(e, $("#tpl-evento")));
    }));
    return caja;
  }
  caja.innerHTML = `<select aria-label="Tipo"><option value="dato">Dato nuevo</option><option value="correccion">Corrección</option></select>
    <textarea rows="3" maxlength="1700" placeholder="Ej: Juana Pérez ganó la medalla de **BRONCE** en -57kg"></textarea>
    <input type="url" class="link-dato" maxlength="290" placeholder="Link de la fuente (opcional): así el agente lo puede seguir">
    <div class="fila-btns"><button class="principal">Guardar</button><button class="cancelar">Cancelar</button></div>
    <p class="ayuda">Se ve al toque para todos y el agente lo pasa al Doc en la próxima vuelta. Para negrita: **así**.</p>`;
  const ta = caja.querySelector("textarea"), sel = caja.querySelector("select"), li = caja.querySelector(".link-dato");
  const b = estado.borradorDato[e.id] || {};
  ta.value = b.texto || ""; sel.value = b.tipo || "dato"; li.value = b.link || "";
  const guardarBorrador = () => (estado.borradorDato[e.id] = { texto: ta.value, tipo: sel.value, link: li.value });
  ta.oninput = guardarBorrador; sel.onchange = guardarBorrador; li.oninput = guardarBorrador;
  caja.querySelector(".cancelar").onclick = () => { estado.agregandoEn = null; delete estado.borradorDato[e.id]; t.replaceWith(tarjetaEvento(e, $("#tpl-evento"))); };
  caja.querySelector(".principal").onclick = async (ev) => {
    let texto = ta.value.trim();
    if (texto.length < 2) return ta.focus();
    let link = li.value.trim();
    if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
    if (link && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(link)) { avisar("Ese link no parece válido"); return li.focus(); }
    if (link) texto += ` (Fuente: ${link})`;
    ev.target.disabled = true;
    try {
      estado.agregandoEn = null;
      await Base.agregarDato({ evento_id: e.id, evento_titulo: e.titulo, tipo: sel.value, texto });
      delete estado.borradorDato[e.id];
      dibujar(); avisar("Dato agregado");
    } catch (err) {
      estado.agregandoEn = e.id; ev.target.disabled = false;
      avisar(/does not exist|schema cache/.test(err.message || "") ? "Falta activar esto en la base (avisale a Martín)" : "No se pudo guardar. Probá de nuevo");
    }
  };
  setTimeout(() => ta.focus(), 0);
  return caja;
}

// ---------- pestaña Bs. As.: planilla de eventos para cubrir + lo de la Agenda que es en Buenos Aires ----------
function esDeBA(e) {
  const lugares = (estado.ba?.lugares || []).map(sinTildes);
  // solo título, fechas/lugar y líneas de sede: en el detalle hay nombres de deportistas (ej. "Lautaro Núñez", "Pilar")
  const sede = (e.bloques || []).map((b) => (b.partes || []).map((p) => p.t).join("")).filter((t) => /^\s*(📍|lugar|sede)/i.test(t));
  const txt = sinTildes([e.titulo, e.evento, e.fechas, ...sede].join(" "));
  return lugares.some((l) => new RegExp(`\\b${l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(txt));
}
function eventosBA() {
  const deLaPlanilla = (estado.ba?.eventos || []).map((f) => {
    const bloques = [];
    if (f.fuente && /^https?:/.test(f.fuente)) bloques.push({ tipo: "link", partes: [{ t: f.fuente, href: f.fuente }, { t: " (Fuente)" }] });
    if (f.nota) bloques.push({ tipo: "texto", partes: [{ t: f.nota }] });
    if (f.lugar) bloques.push({ tipo: "texto", partes: [{ t: "📍 " + f.lugar }] });
    const fechas = [f.inicio, f.fin && f.fin !== f.inicio ? f.fin : ""].filter(Boolean).join(" al ");
    return { id: "ba:" + huella(f.evento + f.inicio), titulo: f.evento, evento: f.evento, deporte: f.deporte, seccion: "agenda", etiqueta: "agenda",
      fechas: [fechas, f.lugar].filter(Boolean).join(" · "), soloFechas: fechas, lugar: f.lugar, contactoAcred: f.acreditacion || "", bloques, version: "1" };
  });
  // si un evento de la Agenda ya está en la planilla (títulos parecidos), queda solo el de la planilla
  const palabras = (t) => new Set(sinTildes(t).split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  const planilla = deLaPlanilla.map((e) => palabras(e.titulo));
  const repetido = (e) => { const p = palabras(e.titulo); return planilla.some((q) => [...p].filter((w) => q.has(w)).length >= Math.max(2, Math.min(p.size, q.size) * 0.5)); };
  const deLaAgenda = estado.eventos.filter((e) => e.seccion === "agenda" && !e.multideportivo && !e.eliminado && esDeBA(e) && !repetido(e));
  const q = sinTildes($("#buscar").value), dep = $("#deporte").value;
  return [...deLaPlanilla, ...deLaAgenda].filter((e) => (!dep || e.deporte === dep) && (!q || sinTildes(e.titulo + " " + e.deporte + " " + e.fechas).includes(q)));
}
function dibujarBA(lista) {
  barraCrear(lista);
  const eventos = eventosBA();
  if (!eventos.length) {
    lista.insertAdjacentHTML("beforeend", `<p class="vacio">${estado.ba?.eventos ? "No hay eventos en Buenos Aires por ahora." : ""}
      ${(estado.ba?.eventos || []).length ? "" : "Para que aparezca la planilla de eventos, hay que publicarla como CSV (avisale a Claude el link)."}</p>`);
    return;
  }
  const tpl = $("#tpl-evento");
  for (const e of eventos) { const t = tarjetaEvento(e, tpl); t.append(cajaAcreditacion(e)); lista.append(t); }
}

// ---------- acreditaciones (Bs. As.) ----------
// "🙋 Voy a pedir" (armando, los demás se suman) → "📨 Ya la pedí" (abre mail / WhatsApp / formulario con el texto) → ✅ / ✕
const ESTADOS_ACRED = { armando: "🙋 Armando pedido", pedida: "📨 Pedida", confirmada: "✅ Confirmada", rechazada: "✕ Rechazada" };
function tipoContacto(c) {
  c = (c || "").trim();
  if (/^https?:\/\//i.test(c)) return { tipo: "link", url: c };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return { tipo: "mail", mail: c };
  if (/^@[\w.]+$/.test(c)) return { tipo: "ig", url: "https://www.instagram.com/" + c.slice(1) + "/" };
  const n = c.replace(/\D/g, "");
  if (n.length >= 8) return { tipo: "wa", num: n.length === 10 ? "549" + n : n.startsWith("54") ? n : n };
  return c ? { tipo: "texto" } : null;
}
function textoAcred(e, personas) {
  const m = estado.modeloAcred || {};
  const lugar = e.lugar ? ", " + e.lugar : "";
  const reemplazar = (s) => (s || "").replace(/\{evento\}/g, e.evento || e.titulo).replace(/\{fechas\}/g, e.soloFechas || e.fechas || "fechas a confirmar")
    .replace(/\{lugar\}/g, lugar).replace(/\{deporte\}/g, e.deporte || "").replace(/\{personas\}/g, personas.map((p) => "- " + p).join("\n"));
  return { asunto: reemplazar(m.asunto || "Pedido de acreditación – Argentina Dorada – {evento}"), texto: reemplazar(m.texto || "Hola, queremos pedir acreditación para {evento} para:\n{personas}\n\nArgentina Dorada") };
}
function cajaAcreditacion(e) {
  const caja = document.createElement("div");
  caja.className = "acred";
  const filas = (estado.acred || []).filter((a) => a.evento_id === e.id);
  // contacto: columna ACREDITACIÓN de la planilla, o el que cargó alguien desde el panel
  const delPanel = (estado.contactos || {})[e.id] || "";
  const contactoBase = e.contactoAcred || delPanel;
  const logueado = window.Base?.activa();
  const tit = document.createElement("div"); tit.className = "acred-tit";
  tit.innerHTML = `<b>Acreditación</b> <span>${contactoBase ? "Contacto: " + escapar(contactoBase) : "Sin contacto todavía"}</span>`;
  if (logueado && estado.acred !== false && !e.contactoAcred) {
    const ed = boton(delPanel ? "Editar" : "+ Cargar contacto", async () => {
      const c = prompt("Contacto para pedir acreditación: link del formulario, mail, WhatsApp o @usuario. Dejalo vacío para borrarlo.", delPanel);
      if (c === null) return;
      try {
        if (c.trim()) { await Base.guardarContacto(e.id, e.titulo, c.trim().slice(0, 500)); avisar("Contacto guardado"); }
        else if (delPanel) { await Base.borrarContacto(e.id); avisar("Contacto borrado"); }
      } catch { avisar("No se pudo guardar. Probá de nuevo"); }
    });
    ed.className = "acred-editar"; tit.append(ed);
  }
  caja.append(tit);
  if (estado.acred === false) { caja.insertAdjacentHTML("beforeend", `<p class="acred-aviso">Falta activar esto en la base (correr supabase/acreditaciones.sql).</p>`); return caja; }
  if (!logueado) { if (filas.length) caja.insertAdjacentHTML("beforeend", `<p class="acred-aviso">${filas.length} pedido(s). Entrá con tu mail para verlos.</p>`); return caja; }
  const yo = Base.nombre();
  const guardar = async (fn, ok) => { try { await fn(); if (ok) avisar(ok); } catch { avisar("No se pudo guardar. Probá de nuevo"); } };
  for (const a of filas) {
    const f = document.createElement("div"); f.className = "acred-fila " + a.estado;
    const quien = (window.__miembros || []).find((m) => (m.email || "").toLowerCase() === (a.creado_por || "").toLowerCase())?.nombre || (a.creado_por || "").split("@")[0];
    const fecha = new Date(a.actualizado_en || a.creado_en).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" });
    f.innerHTML = `<div><span class="acred-estado">${ESTADOS_ACRED[a.estado]}</span> <small>${escapar(quien)} · ${fecha}</small></div>
      <div class="acred-personas">${a.personas.length ? a.personas.map((p) => `<span>${escapar(p)}</span>`).join("") : "<em>Nadie todavía</em>"}</div>
      ${a.nota ? `<p class="acred-nota">${escapar(a.nota)}</p>` : ""}`;
    const pie = document.createElement("div"); pie.className = "acred-pie";
    const estoy = a.personas.some((p) => sinTildes(p) === sinTildes(yo));
    if (a.estado === "armando") {
      pie.append(boton(estoy ? "Me bajo" : "🙋 Me sumo", () => guardar(() => Base.cambiarAcred(a.id, { personas: estoy ? a.personas.filter((p) => sinTildes(p) !== sinTildes(yo)) : [...a.personas, yo] }), estoy ? "Te bajaste" : "Te sumaste")));
      pie.append(boton("+ Otra persona", () => {
        const n = prompt("¿A quién sumás? (nombre y, si querés, rol: foto, prensa, video)");
        if (n && n.trim()) guardar(() => Base.cambiarAcred(a.id, { personas: [...a.personas, n.trim().slice(0, 80)] }), "Sumado");
      }));
      pie.append(boton("📨 Ya la pido", () => abrirPedido(e, a, contactoBase, caja)));
    } else if (a.estado === "pedida") {
      pie.append(boton("✅ Confirmada", () => guardar(() => Base.cambiarAcred(a.id, { estado: "confirmada" }), "¡Confirmada!")));
      pie.append(boton("✕ Rechazada", () => guardar(() => Base.cambiarAcred(a.id, { estado: "rechazada" }), "Anotado")));
      pie.append(boton("Ver texto", () => abrirPedido(e, a, contactoBase, caja, true)));
    } else {
      pie.append(boton("↩ Volver a pedida", () => guardar(() => Base.cambiarAcred(a.id, { estado: "pedida" }))));
    }
    const del = boton("Borrar", () => {
      if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "¿Seguro?"; setTimeout(() => { del.dataset.ok = ""; del.textContent = "Borrar"; }, 4000); return; }
      guardar(() => Base.borrarAcred(a.id), "Borrado");
    });
    del.className = "borrar"; pie.append(del);
    f.append(pie); caja.append(f);
  }
  if (!contactoBase) return caja; // sin link ni contacto no hay a quién pedirle: no aparece "Voy a pedir"
  const nuevo = boton("🙋 Voy a pedir", () => {
    const nota = prompt("¿Querés dejar una nota? (ej: \"la pido el lunes, avisen si se suman\"). Podés dejarlo vacío.") ?? null;
    if (nota === null) return;
    guardar(() => Base.crearAcred({ evento_id: e.id, evento_titulo: e.titulo, personas: [yo], nota: nota.trim().slice(0, 300) || null, contacto: contactoBase || null }),
      "Listo: los demás ya pueden sumarse");
  });
  nuevo.className = "acred-nuevo";
  caja.append(nuevo);
  return caja;
}
function abrirPedido(e, a, contacto, caja, soloVer = false) {
  caja.querySelector(".acred-form")?.remove();
  const { asunto, texto } = textoAcred(e, a.personas);
  const f = document.createElement("div"); f.className = "acred-form";
  f.innerHTML = `<label>Contacto (link del formulario, mail, WhatsApp o @usuario)<input name="contacto" value="${escapar(a.contacto || contacto || "")}" placeholder="Ej: prensa@federacion.org.ar"></label>
    <label>Texto (revisalo y sumá lo que pida el evento: rol, DNI, etc.)<textarea name="texto" rows="9">${escapar(texto)}</textarea></label>
    <div class="acred-pie"></div>`;
  const pie = f.querySelector(".acred-pie");
  const val = () => ({ c: f.querySelector("[name=contacto]").value.trim(), t: f.querySelector("[name=texto]").value });
  pie.append(boton("Abrir y copiar texto", async () => {
    const { c, t } = val();
    const k = tipoContacto(c);
    try { await navigator.clipboard.writeText(t); } catch {}
    if (!k || k.tipo === "texto") return avisar("Texto copiado. Poné un link, mail o WhatsApp para abrirlo directo");
    if (k.tipo === "mail") location.href = `mailto:${k.mail}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(t)}`;
    else if (k.tipo === "wa") window.open(`https://wa.me/${k.num}?text=${encodeURIComponent(t)}`, "_blank");
    else { window.open(k.url, "_blank"); avisar("Texto copiado: pegalo en el formulario o en el mensaje"); }
    if (c && c !== a.contacto) Base.cambiarAcred(a.id, { contacto: c }).catch(() => {});
  }));
  if (!soloVer) pie.append(boton("✓ Marcar como pedida", async () => {
    const { c } = val();
    f.remove();
    try { await Base.cambiarAcred(a.id, { estado: "pedida", contacto: c || null }); avisar("Marcada como pedida"); } catch { avisar("No se pudo guardar"); }
    dibujar();
  }));
  pie.append(boton("Cerrar", () => { f.remove(); dibujar(); }));
  caja.append(f);
  f.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function formCrear() {
  if (estado.formEl) return estado.formEl;
  const f = document.createElement("form");
  f.className = "crear";
  f.innerHTML = `
    <h3>Crear evento</h3>
    <label>¿Qué es?<select name="estado">
      <option value="publicable">Resultado terminado (listo para publicar)</option>
      <option value="en_curso">Resultado en curso</option>
      <option value="mas_info">Resultado, falta info</option>
      <option value="agenda">Agenda (evento que viene)</option></select></label>
    <label>Deporte<input name="deporte" list="lista-deportes" placeholder="Ej: Judo" maxlength="60"></label>
    <label>Evento *<input name="titulo" required minlength="3" maxlength="200" placeholder="Ej: Panamericano de Judo en Lima, Perú"></label>
    <div class="fila2">
      <label>Fechas<input name="fechas" placeholder="Ej: 12 al 15/11" maxlength="60"></label>
      <label>Lugar<input name="lugar" placeholder="Ej: CeNARD, CABA" maxlength="120"></label>
    </div>
    <label>Qué pasó / detalle<textarea name="detalle" rows="5" maxlength="5000" placeholder="Una línea por resultado. Para negrita: **BRONCE**"></textarea></label>
    <label>Link de la fuente<input name="link" type="url" placeholder="https://…"></label>
    <p class="ayuda">Queda en el panel al toque. En la próxima vuelta el agente lo pasa al Doc y le sigue el rastro.</p>
    <div class="pie"><button type="submit" class="principal">Guardar</button><button type="button" class="cancelar">Cancelar</button></div>
    <datalist id="lista-deportes"></datalist>`;
  f.querySelector(".cancelar").onclick = () => { estado.creando = false; f.reset(); dibujar(); };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    for (const k in d) d[k] = d[k].trim() || null;
    const fila = { ...d, seccion: d.estado === "agenda" ? "agenda" : "resultados" };
    const b = f.querySelector("[type=submit]"); b.disabled = true;
    try {
      await Base.crearManual(fila);
      estado.creando = false; f.reset();
      estado.tab = fila.seccion; llenarDeportes(); dibujar();
      avisar("Evento creado");
    } catch (err) {
      avisar(/does not exist|schema cache/.test(err.message || "") ? "Falta activar esto en la base (avisale a Martín)" : "No se pudo guardar. Probá de nuevo");
    } finally { b.disabled = false; }
  };
  return (estado.formEl = f);
}

function barraCrear(lista) {
  const barra = document.createElement("div");
  barra.className = "barra-crear";
  if (!estado.creando) {
    const b = boton("+ Crear evento", () => {
      if (!window.Base?.activa()) return avisar("Entrá con tu mail (arriba a la izquierda) para crear eventos");
      estado.creando = true; dibujar();
      const f = estado.formEl;
      f.querySelector("[name=estado]").value = estado.tab === "agenda" || estado.tab === "ba" ? "agenda" : "publicable";
      f.querySelector("[name=titulo]").focus();
    });
    b.className = "btn-crear";
    barra.append(b);
    lista.append(barra);
    return;
  }
  const f = formCrear();
  const deps = [...new Set(estado.eventos.map((e) => e.deporte).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  f.querySelector("#lista-deportes").innerHTML = deps.map((d) => `<option value="${escapar(d)}">`).join("");
  lista.append(f);
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
    if (e.vencido) return false; // terminó hace más de 7 días
    if (e.eliminado && (!conFiltros || !$("#ver-publicados").checked)) return false;
    const esAgenda = seccion === "agenda"; // la agenda no se "publica": siempre se ve todo
    if (!conFiltros) return esAgenda || !estaPublicado(e) || tieneNovedades(e);
    if (!esAgenda && !$("#ver-publicados").checked && estaPublicado(e) && !tieneNovedades(e)) return false;
    if (tab === "resultados" && estado.filtroEstado && e.etiqueta !== estado.filtroEstado) return false;
    const dep = $("#deporte").value;
    if (dep && e.deporte !== dep) return false;
    const q = $("#buscar").value.trim().toLowerCase();
    if (q && !textoEvento(e).includes(q)) return false;
    return true;
  });
}

function dentroDelRango(n) {
  const desde = Date.now() - Number($("#rango").value) * 864e5;
  return new Date(n.encontrado || n.publicado || 0).getTime() >= desde - 3 * 36e5;
}
function noticiasFiltradas(conFiltros = true) {
  return estado.noticias.filter((n) => {
    if (!dentroDelRango(n)) return false;
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
function multiActivos() { return estado.eventos.filter((e) => e.multideportivo && e.seccion === "resultados" && !e.vencido); }
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
    const n = t === "radar" ? noticiasFiltradas(false).length : t === "noticias" ? noticiasParaPublicar(false).length : t === "ba" ? eventosBA().length : t.startsWith("m:") || t === "graficas" ? "" : eventosDe(t, false).length;
    b.querySelector(".n").textContent = n || "";
  }
  document.querySelectorAll("[data-para]").forEach((el) => (el.hidden = !el.dataset.para.split(" ").includes(estado.tab)));
  document.querySelector(".filtros").hidden = esMulti || estado.tab === "graficas";

  const lista = $("#lista");
  lista.innerHTML = "";
  lista.classList.remove("modo-multi", "modo-graficas");
  if (estado.tab === "graficas") return window.Graficas?.dibujar(lista);
  if (estado.tab === "radar") return dibujarRadar(lista);
  if (estado.tab === "noticias") return dibujarNoticias(lista);
  if (estado.tab === "ba") return dibujarBA(lista);
  if (esMulti) return dibujarMulti(lista);

  const eventos = eventosDe(estado.tab);
  barraCrear(lista);
  if (!estado.doc && !eventos.length) { lista.insertAdjacentHTML("beforeend", `<p class="vacio">Todavía no se leyó el Doc. Se carga solo en la próxima vuelta del bot.</p>`); return; }
  if (!eventos.length) { lista.insertAdjacentHTML("beforeend", `<p class="vacio">Nada por acá. Probá con "Todos" o tildá "Mostrar publicados y eliminados".</p>`); return; }
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
  if (abierto) { detalle.hidden = false; detalle.append(...renderBloques(e.bloques)); if (!e.id.startsWith("ba:")) detalle.append(cajaAgregarDato(e, t)); }
  cabeza.onclick = () => {
    estado.abiertos.has(e.id) ? estado.abiertos.delete(e.id) : estado.abiertos.add(e.id);
    t.replaceWith(tarjetaEvento(e, tpl));
  };

  if (e.seccion === "agenda") { t.querySelector(".publicado").remove(); t.querySelector(".novedad").hidden = true; }
  else configurarPublicado(t.querySelector(".publicado"), t, e);
  t.querySelector(".copiar").onclick = () => copiarEvento(e);
  if (e.seccion === "resultados" && window.Graficas) {
    const g = boton("🎨 Gráfica", () => { Graficas.desdeEvento(e, { medalla: tipoMedalla }); estado.tab = "graficas"; dibujar(); window.scrollTo({ top: 0 }); });
    t.querySelector(".pie").insertBefore(g, t.querySelector(".pie .publicado"));
  }
  if (!e.manual && !e.archivado && !e.id.startsWith("ba:")) botonEliminar(e, t);
  if (!e.archivado && (e.etiqueta === "mas_info" || e.pasadoAPublicable)) botonPublicable(e, t);
  if (e.manual) {
    const chip = document.createElement("span"); chip.className = "chip manual"; chip.textContent = "✍️ A mano";
    chip.title = "Lo cargó alguien desde el panel. Cuando el agente lo pase al Doc, queda el del Doc.";
    t.querySelector(".chips").append(chip);
    if (window.Base?.activa() && e.idBase) {
      const borrar = boton("Borrar", async () => {
        if (borrar.dataset.ok !== "1") { borrar.dataset.ok = "1"; borrar.textContent = "¿Seguro? Tocá de nuevo"; return; }
        try { await Base.borrarManual(e.idBase); avisar("Borrado"); } catch { avisar("No se pudo borrar"); }
      });
      borrar.className = "borrar";
      t.querySelector(".pie").append(borrar);
    }
  }
  return t;
}

// "Falta info" que ya completaron con "+ Agregar dato": se pasa a Publicable para todos (el agente cambia el título en el Doc)
function botonPublicable(e, t) {
  if (!window.Base?.activa()) return;
  const volver = !!e.pasadoAPublicable;
  const b = boton(volver ? "↩ Volver a Falta info" : "✓ Pasar a Publicable", async () => {
    b.disabled = true;
    try {
      if (volver) {
        if (!e.pasadoAPublicable.idBase) { b.disabled = false; return avisar("El agente ya lo pasó en el Doc"); }
        await Base.borrarDato(e.pasadoAPublicable.idBase); avisar("Volvió a Falta info");
      } else {
        await Base.agregarDato({ evento_id: e.id, evento_titulo: e.titulo, tipo: "correccion",
          texto: "[PUBLICABLE] Ya está completo: en el título cambiar (Necesito más info) por PUBLICABLE" });
        avisar("Pasó a Publicable");
      }
    } catch { b.disabled = false; avisar("No se pudo guardar. Probá de nuevo"); }
  });
  b.className = volver ? "borrar" : "pasar-publicable";
  const pie = t.querySelector(".pie");
  pie.insertBefore(b, pie.firstChild);
}

// "🗑 Eliminar" (eventos del Doc): se oculta para todos y el agente lo saca del Doc en la próxima vuelta
function botonEliminar(e, t) {
  if (e.eliminado) {
    const chip = document.createElement("span"); chip.className = "chip eliminado"; chip.textContent = "🗑 Eliminado";
    t.querySelector(".chips").append(chip); t.classList.add("ya-publicado");
  }
  if (!window.Base?.activa()) return;
  const b = boton(e.eliminado ? "↩ Recuperar" : "🗑 Eliminar", async () => {
    if (e.eliminado) {
      if (!e.eliminado.idBase) return avisar("El agente ya lo está sacando del Doc");
      try { await Base.borrarDato(e.eliminado.idBase); avisar("Recuperado"); } catch { avisar("No se pudo recuperar"); }
      return;
    }
    if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "¿Seguro? Tocá de nuevo"; setTimeout(() => { b.dataset.ok = ""; b.textContent = "🗑 Eliminar"; }, 4000); return; }
    b.disabled = true;
    try { await Base.agregarDato({ evento_id: e.id, evento_titulo: e.titulo, tipo: "correccion", texto: "[ELIMINAR] Sacar este evento del Doc" }); avisar("Eliminado (se puede recuperar con \"Mostrar publicados y eliminados\")"); }
    catch (err) { b.disabled = false; avisar(/check constraint|violates|does not exist/.test(err.message || "") ? "Falta activar esto en la base (avisale a Martín)" : "No se pudo eliminar. Probá de nuevo"); }
  });
  b.className = "borrar";
  t.querySelector(".pie").append(b);
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
    if (b.agregado) {
      el.classList.add("agregado");
      el.title = "Agregado desde el panel: en la próxima vuelta el agente lo pasa al Doc";
      el.insertAdjacentHTML("afterbegin", `<span class="marca-dato">✍️</span> `);
      if (window.Base?.activa() && b.idBase) {
        const x = document.createElement("button"); x.className = "quitar-dato"; x.textContent = "×"; x.title = "Borrar este dato";
        x.onclick = async () => { try { await Base.borrarDato(b.idBase); avisar("Dato borrado"); } catch { avisar("No se pudo borrar"); } };
        el.append(x);
      }
    }
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

// ---------- copiar para Instagram ----------
// Arma el texto listo para pegar en el posteo: sin links de fuentes, con emojis y hashtags.
// Lo que está en gris (ya publicado) no se copia, así en un evento en curso solo sale lo nuevo.
// El emoji sale de lo que está en negrita (la medalla del argentino), no de los rivales ("oro para X").
function sinAcentos(t) { return t.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function hashtag(t) {
  const limpio = sinAcentos(String(t || "")).replace(/\(.*?\)/g, " ").replace(/[^A-Za-z0-9 ]/g, " ").trim();
  if (!limpio) return "";
  return "#" + limpio.split(/\s+/).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("");
}
// Hashtags que tienen que ver con el evento: deporte, nombre del torneo y tipo de torneo + deporte.
const TIPOS = [
  [/JUEGOS OLIMPICOS DE LA JUVENTUD/, "JuegosOlimpicosDeLaJuventud"], [/JUEGOS PARALIMPICOS/, "JuegosParalimpicos"],
  [/JUEGOS OLIMPICOS/, "JuegosOlimpicos"], [/PARAPANAMERICANO/, "Parapanamericanos"],
  [/JUEGOS PANAMERICANOS/, "JuegosPanamericanos"], [/JUEGOS (SURAMERICANOS|SUDAMERICANOS|ODESUR)/, "JuegosSuramericanos"],
  [/WORLD GAMES/, "TheWorldGames"],
  [/MUNDIAL|CAMPEONATO DEL MUNDO|WORLD CHAMPIONSHIP/, "Mundial"], [/COPA DEL MUNDO|WORLD CUP/, "CopaDelMundo"],
  [/PANAMERICANO|AMERICAS CHAMPIONSHIP/, "Panamericano"], [/SUDAMERICANO|SURAMERICANO/, "Sudamericano"],
  [/GRAND PRIX/, "GrandPrix"], [/GRAND SLAM/, "GrandSlam"],
];
function hashtagsEvento(e, extra = []) {
  const titulo = sinAcentos((e.titulo || "").toUpperCase());
  const dep = hashtag(e.deporte).slice(1);
  const tags = [...extra];
  if (dep) tags.push("#" + dep);
  for (const [re, nombre] of TIPOS) {
    if (!re.test(titulo)) continue;
    tags.push("#" + nombre + (nombre.startsWith("Juegos") || nombre === "TheWorldGames" || !dep ? "" : dep));
    break;
  }
  // nombre propio del torneo (lo que va antes de " EN "), si es corto: #Finalissima, #MundialFip
  const nombre = (e.evento || "").split(/ EN | DE LA | - /i)[0].replace(/\(.*?\)/g, "").trim();
  const generico = /^(CAMPEONATO|COPA|WORLD CUP|MUNDIAL$|TORNEO|CIERRE)/i.test(sinAcentos(nombre));
  if (nombre && !generico && nombre.split(/\s+/).length <= 4) tags.push(hashtag(nombre));
  const lista = [...new Set(tags.filter((t) => t && t.length > 2))].slice(0, 4);
  return lista.length ? lista : ["#DeporteArgentino"];
}
function emojiDe(linea) {
  const t = sinAcentos(linea.toUpperCase());
  if (/CAMPEO?N|CAMPEONA|CAMPEONES/.test(t) && !/SUBCAMPE/.test(t)) return "🏆 ";
  if (/DORADA|\bORO\b/.test(t)) return "🥇 ";
  if (/PLATEADA|\bPLATA\b|SUBCAMPE/.test(t)) return "🥈 ";
  if (/BRONCE/.test(t)) return "🥉 ";
  if (/CLASIFICO|CLASIFICARON/.test(t)) return "✅ ";
  return "";
}
// nombres que ya tuvieron su Instagram en el Doc (data/instagram.json): se etiquetan solos
function etiquetar(txt) {
  for (const [nombre, usuario] of estado.instagram || []) {
    if (txt.includes("@" + usuario)) continue;
    const i = txt.indexOf(nombre);
    if (i < 0) continue;
    const fin = i + nombre.length;
    if (/[\p{L}]/u.test(txt[fin] || "") || (i > 0 && /[\p{L}]/u.test(txt[i - 1]))) continue;
    txt = txt.slice(0, fin) + ` (@${usuario})` + txt.slice(fin);
  }
  return txt;
}
function lineaIG(partes, incluirGris) {
  let txt = "";
  for (const p of partes) {
    if (p.c === "gris" && !incluirGris) continue;
    if (p.href) {
      try {
        const u = new URL(p.href);
        if (u.hostname.replace(/^www\./, "") === "instagram.com") { txt += "@" + u.pathname.split("/").filter(Boolean)[0]; continue; }
      } catch {}
      continue; // los demás links (fuentes) no van
    }
    txt += p.t;
  }
  return etiquetar(txt
    .replace(/\(\s*\)/g, ""))                      // paréntesis que quedaron vacíos al sacar el link
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
// incluirGris: en los eventos comunes se postea el torneo completo al final, así que va todo.
// En los multideportivos (posteo diario) lo gris ya se publicó y no se repite.
function textoIG(e, { cabecera, hashtags, incluirGris = true } = {}) {
  const lineas = [];
  lineas.push(cabecera || `🇦🇷 ${e.deporte ? e.deporte.toUpperCase() + " | " : ""}${(e.evento || e.titulo).toUpperCase()}`);
  if (e.fechas) lineas.push(`🗓️ ${e.fechas}`);
  lineas.push("");
  for (const b of e.bloques || []) {
    if (b.tipo === "link") continue;
    if (b.tipo === "espacio") { if (lineas.at(-1) !== "") lineas.push(""); continue; }
    const t = lineaIG(b.partes, incluirGris);
    if (!t) continue;
    if (b.tipo === "sub") { if (lineas.at(-1) !== "") lineas.push(""); lineas.push(`▪️ ${t.toUpperCase()}`); }
    else lineas.push(emojiDe(b.partes.filter((p) => p.b && (incluirGris || p.c !== "gris")).map((p) => p.t).join(" ")) + t);
  }
  while (lineas.at(-1) === "") lineas.pop();
  const tags = hashtags || hashtagsEvento(e);
  if (tags.length) lineas.push("", tags.join(" "));
  return lineas.join("\n");
}
async function copiarTexto(texto, aviso = "Copiado para Instagram") {
  try { await navigator.clipboard.writeText(texto); avisar(aviso); } catch { avisar("No se pudo copiar"); }
}
function copiarEvento(e, opciones) { return copiarTexto(textoIG(e, opciones)); }

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
  sw.innerHTML = `<button data-v="dia">Por día</button><button data-v="deporte">Por deporte</button><button data-v="medallas">🏅 Solo medallas</button>`;
  sw.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("activo", b.dataset.v === vista);
    b.onclick = () => { estado.multiVista = b.dataset.v; estado.multiSel = null; estado.multiBusca = ""; estado.filtroMedalla = ""; dibujar(); };
  });
  cab.append(sw);
  lista.append(cab);

  if (m.resumen_final) lista.append(cajaFinal(e));
  if (m.general.length) { const g = cajaMulti(e, "general", "Info general", m.general, { cerrada: true, sinPublicar: true }); g.classList.add("info-general"); lista.append(g); }

  if (vista === "medallas") return dibujarMedallas(lista, e);

  if (vista === "dia") {
    if (!m.dias.length) {
      lista.append(Object.assign(document.createElement("p"), { className: "vacio",
        textContent: "El agente empieza a ordenar este evento día por día desde su próxima vuelta. Mientras tanto, mirá 'Por deporte'." }));
      return;
    }
    const sel = m.dias.find((d) => d.titulo === estado.multiSel) || m.dias[0];
    lista.append(selector(m.dias.map((d) => d.titulo), sel.titulo, (t) => t.replace(/^D[IÍ]A\b\s*/i, "Día ").replace(/^D[IÍ]AS ANTERIORES/i, "Días anteriores")));
    lista.append(buscadorDeporte("Buscar deporte en este día…"));
    const r = sel.resumen;
    const q = normBusca(estado.multiBusca);
    if (!q) {
      if (r.destacados.length || r.posteo) lista.append(cajaResumen(e, sel));
      else lista.append(Object.assign(document.createElement("p"), { className: "ayuda pendiente", textContent: "El resumen del día aparece cuando termina la jornada." }));
    }
    const deps = sel.deportes.filter((dep) => !q || normBusca(dep.nombre).includes(q));
    if (!deps.length) lista.append(Object.assign(document.createElement("p"), { className: "vacio", textContent: "Ese deporte no compitió este día." }));
    for (const dep of deps) lista.append(cajaMulti(e, sel.titulo + "|" + dep.nombre, dep.nombre, dep.bloques, { sub: sel.titulo }));
  } else {
    if (!m.deportes.length) { lista.append(Object.assign(document.createElement("p"), { className: "vacio", textContent: "Todavía no hay deportes cargados." })); return; }
    const q = normBusca(estado.multiBusca);
    // "General" ya está en el día a día y arriba en "Info general": no va como deporte
    const opciones = m.deportes.filter((d) => normBusca(d.nombre) !== "general" && (!q || normBusca(d.nombre).includes(q)));
    lista.append(buscadorDeporte("Buscar deporte…"));
    if (!opciones.length) { lista.append(Object.assign(document.createElement("p"), { className: "vacio", textContent: "No hay ningún deporte con ese nombre." })); return; }
    const sel = opciones.find((d) => d.nombre === estado.multiSel) || opciones[0];
    lista.append(selector(opciones.map((d) => d.nombre), sel.nombre));
    for (const d of sel.dias) lista.append(cajaMulti(e, (d.dia || "") + "|" + sel.nombre, d.dia ? d.dia.replace(/^D[IÍ]A\b\s*/i, "Día ").replace(/^D[IÍ]AS ANTERIORES/i, "Días anteriores") : sel.nombre, d.bloques, { sub: sel.nombre }));
  }
}

// ---------- "Solo medallas": junta las medallas argentinas de todos los deportes ----------
// Sale de lo que ya escribe el agente: una línea con la medalla en negrita = una medalla.
const MEDALLAS = [
  { clave: "oro", titulo: "Oro", emoji: "🥇", re: /DORAD|\bORO\b|CAMPEO?N(A|ES|AS)?\b/ },
  { clave: "plata", titulo: "Plata", emoji: "🥈", re: /PLATEAD|\bPLATA\b|SUBCAMPE/ },
  { clave: "bronce", titulo: "Bronce", emoji: "🥉", re: /BRONCE/ },
];
function tipoMedalla(partes) {
  const negrita = sinAcentos(partes.filter((p) => p.b).map((p) => p.t).join(" ").toUpperCase());
  if (!negrita) return null;
  // primero plata (para que "SUBCAMPEÓN" no cuente como oro)
  for (const k of ["plata", "bronce", "oro"]) {
    const m = MEDALLAS.find((x) => x.clave === k);
    if (m.re.test(negrita) && !(k === "oro" && /SUBCAMPE/.test(negrita))) return m;
  }
  return null;
}
function juntarMedallas(m) {
  const vistas = new Set(), lista = [];
  for (const dep of m.deportes) {
    for (const d of dep.dias) {
      for (const b of d.bloques) {
        // "sub" adentro de un deporte = línea de dato en negrita (ej. "Bronce vs Canadá 36-5")
        if (b.tipo !== "texto" && b.tipo !== "sub") continue;
        const med = tipoMedalla(b.partes);
        if (!med) continue;
        const clave = b.partes.map((p) => p.t).join("").trim();
        if (vistas.has(clave)) continue;
        vistas.add(clave);
        lista.push({ med, deporte: dep.nombre, dia: d.dia, partes: b.partes });
      }
    }
  }
  return lista;
}
function dibujarMedallas(lista, e) {
  const todas = juntarMedallas(e.multi);
  const cuenta = Object.fromEntries(MEDALLAS.map((x) => [x.clave, todas.filter((t) => t.med.clave === x.clave).length]));
  const oficial = estado.medalleros?.[e.multi.nombre];
  const filtro = estado.filtroMedalla || "";

  // fichas de arriba: se tocan para ver solo esa medalla (Total = todas)
  const fichas = document.createElement("section");
  fichas.className = "medallas-total";
  const ficha = (clave, emoji, num, titulo, extra = "") => {
    const b = document.createElement("button");
    b.className = (clave ? "" : "total ") + (filtro === clave ? "activa" : "");
    b.innerHTML = `${emoji ? `<span class="emoji">${emoji}</span>` : ""}<b>${num}</b><span>${titulo}</span>${extra}`;
    b.onclick = () => { estado.filtroMedalla = filtro === clave ? "" : clave; dibujar(); };
    return b;
  };
  for (const x of MEDALLAS) {
    const of = oficial ? oficial[x.clave] : null;
    fichas.append(ficha(x.clave, x.emoji, cuenta[x.clave], x.titulo,
      of != null && of !== cuenta[x.clave] ? `<small class="dif">Oficial: ${of}</small>` : ""));
  }
  fichas.append(ficha("", "", todas.length, "Total",
    oficial && oficial.total !== todas.length ? `<small class="dif">Oficial: ${oficial.total}</small>` : ""));
  lista.append(fichas);

  // aviso: comparación con el medallero oficial
  const aviso = document.createElement("p");
  aviso.className = "ayuda pendiente";
  if (oficial) {
    const falta = oficial.total - todas.length;
    aviso.innerHTML = falta === 0
      ? `✅ Coincide con el <a href="${escapar(oficial.fuente)}" target="_blank" rel="noopener">medallero oficial</a>.`
      : falta > 0
        ? `⚠️ El <a href="${escapar(oficial.fuente)}" target="_blank" rel="noopener">medallero oficial</a> tiene ${falta} medalla${falta > 1 ? "s" : ""} más de las que cargó el agente: falta${falta > 1 ? "n" : ""} cargar en el Doc.`
        : `⚠️ El agente cargó ${-falta} medalla${-falta > 1 ? "s" : ""} más que el <a href="${escapar(oficial.fuente)}" target="_blank" rel="noopener">medallero oficial</a> (puede ser una repetida o una "(Creo)").`;
    aviso.classList.toggle("alerta", falta !== 0);
  } else {
    aviso.textContent = "Contadas desde lo que escribió el agente (una línea con la medalla en negrita = una medalla). Todavía no se pudo leer el medallero oficial.";
  }
  lista.append(aviso);
  lista.append(buscadorDeporte("Buscar deporte o deportista…"));

  if (!todas.length) { lista.append(Object.assign(document.createElement("p"), { className: "vacio", textContent: "Todavía no hay medallas." })); return; }
  const q = normBusca(estado.multiBusca);
  let hubo = false;
  for (const x of MEDALLAS) {
    if (filtro && filtro !== x.clave) continue;
    const items = todas.filter((t) => t.med.clave === x.clave &&
      (!q || normBusca(t.deporte + " " + t.partes.map((p) => p.t).join("")).includes(q)));
    if (!items.length) continue;
    hubo = true;
    const caja = document.createElement("article");
    caja.className = "evento caja-medallas abierto " + x.clave;
    caja.innerHTML = `<div class="cabeza-fija"><span class="titulo">${x.emoji} ${x.titulo} · ${items.length}</span></div>`;
    const det = document.createElement("div");
    det.className = "detalle";
    for (const it of items) {
      const fila = document.createElement("div");
      fila.className = "fila-medalla";
      fila.innerHTML = `<span class="chip deporte">${escapar(it.deporte)}</span>${it.dia ? `<span class="dia-medalla">${escapar(it.dia.replace(/^D[IÍ]A\b\s*/i, "Día ").replace(/^D[IÍ]AS ANTERIORES/i, "Días anteriores").split(" - ")[0])}</span>` : ""}`;
      const p = document.createElement("p");
      renderPartes(it.partes.filter((r) => !r.href), p);
      fila.append(p);
      det.append(fila);
    }
    caja.append(det);
    lista.append(caja);
  }
  if (!hubo) lista.append(Object.assign(document.createElement("p"), { className: "vacio", textContent: "No hay medallas con ese filtro." }));
  const pie = document.createElement("div");
  pie.className = "pie suelto";
  pie.append(boton("Copiar medallero para IG", () => copiarTexto(textoMedallasIG(e, todas, cuenta, oficial))));
  lista.append(pie);
}
function textoMedallasIG(e, todas, cuenta, oficial) {
  // si hay medallero oficial, el total sale de ahí
  const c = oficial || { ...cuenta, total: todas.length };
  const l = [`🇦🇷 ${e.multi.nombre.toUpperCase()} | MEDALLERO ARGENTINO`, "",
    `🥇 ${c.oro}  🥈 ${c.plata}  🥉 ${c.bronce}  ·  Total: ${c.total}`];
  for (const x of MEDALLAS) {
    const items = todas.filter((t) => t.med.clave === x.clave);
    if (!items.length) continue;
    l.push("", `${x.emoji} ${x.titulo.toUpperCase()}`);
    // para el posteo alcanza con la primera oración de cada medalla
    for (const it of items) l.push(`▪️ ${it.deporte}: ${lineaIG(it.partes, true).split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/)[0].replace(/\.$/, "")}`);
  }
  l.push("", hashtagsEvento({ titulo: e.titulo }, [hashtag(e.multi.nombre)]).join(" "));
  return l.join("\n");
}

function normBusca(t) { return sinAcentos(String(t || "").toLowerCase()).trim(); }

// Buscador de deporte de la pestaña del multideportivo. Se redibuja la lista y se vuelve a poner el cursor donde estaba.
function buscadorDeporte(placeholder) {
  const caja = document.createElement("div");
  caja.className = "buscador-multi";
  caja.innerHTML = `<input type="search" placeholder="${placeholder}" aria-label="Buscar deporte">`;
  const inp = caja.querySelector("input");
  inp.value = estado.multiBusca || "";
  inp.oninput = () => {
    estado.multiBusca = inp.value; estado.multiSel = estado.multiVista === "deporte" ? null : estado.multiSel;
    const pos = inp.selectionStart;
    dibujar();
    const nuevo = document.querySelector(".buscador-multi input");
    if (nuevo) { nuevo.focus(); nuevo.setSelectionRange(pos, pos); }
  };
  return caja;
}

// Fila de días o deportes: se desliza de costado (con el dedo, la ruedita o las flechas ◀ ▶).
function selector(opciones, actual, etiqueta = (x) => x) {
  const caja = document.createElement("div");
  caja.className = "selector-caja";
  const d = document.createElement("div");
  d.className = "selector";
  for (const o of opciones) {
    const b = document.createElement("button");
    b.textContent = etiqueta(o);
    b.classList.toggle("activo", o === actual);
    b.onclick = () => { estado.multiSel = o; estado.selScroll = d.scrollLeft; dibujar(); };
    d.append(b);
  }
  const flecha = (txt, dir) => {
    const f = document.createElement("button");
    f.className = "flecha-sel " + (dir < 0 ? "izq" : "der");
    f.textContent = txt; f.setAttribute("aria-label", dir < 0 ? "Anteriores" : "Siguientes");
    f.onclick = () => d.scrollBy({ left: dir * d.clientWidth * 0.8, behavior: "smooth" });
    return f;
  };
  const izq = flecha("◀", -1), der = flecha("▶", 1);
  const actualizar = () => {
    izq.hidden = d.scrollLeft <= 4;
    der.hidden = d.scrollLeft + d.clientWidth >= d.scrollWidth - 4;
  };
  d.addEventListener("scroll", actualizar, { passive: true });
  // la ruedita del mouse también lo mueve de costado
  d.addEventListener("wheel", (ev) => {
    if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX) && d.scrollWidth > d.clientWidth) { d.scrollLeft += ev.deltaY; ev.preventDefault(); }
  }, { passive: false });
  caja.append(izq, d, der);
  requestAnimationFrame(() => {
    if (estado.selScroll != null) { d.scrollLeft = estado.selScroll; estado.selScroll = null; }
    else d.querySelector(".activo")?.scrollIntoView({ inline: "nearest", block: "nearest" });
    actualizar();
  });
  return caja;
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
  t.querySelector(".copiar").onclick = () => copiarEvento(mini, {
    cabecera: `🇦🇷 ${e.multi.nombre.toUpperCase()} | ${(sub && !/^d[ií]a/i.test(sub) ? sub : titulo).toUpperCase()}`,
    incluirGris: false,
    hashtags: hashtagsEvento({ titulo: e.titulo, deporte: sub && !/^d[ií]a/i.test(sub) ? sub : titulo }, [hashtag(e.multi.nombre)]) });
  const bPub = t.querySelector(".publicado");
  if (!sinPublicar && window.Graficas) {
    const deporte = sub && !/^d[ií]a/i.test(sub) ? sub : titulo;
    bPub.before(boton("🎨 Gráfica", () => {
      Graficas.desdeEvento({ deporte, evento: e.multi.nombre, bloques }, { medalla: tipoMedalla });
      estado.tab = "graficas"; dibujar(); window.scrollTo({ top: 0 });
    }));
  }
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
  if (dia.resumen.posteo) pie.append(boton("Copiar posteo para IG", () =>
    copiarTexto(`${dia.resumen.posteo}\n\n${hashtagsEvento({ titulo: e.titulo }, [hashtag(e.multi.nombre)]).join(" ")}`)));
  pie.append(boton("Copiar destacados", () => copiarEvento(mini, {
    cabecera: `🇦🇷 ${e.multi.nombre.toUpperCase()} | RESUMEN ${dia.titulo.toUpperCase()}`, incluirGris: false,
    hashtags: hashtagsEvento({ titulo: e.titulo }, [hashtag(e.multi.nombre)]) })));
  if (window.Graficas && dia.resumen.destacados.length) pie.append(boton("🎨 Gráfica", () => {
    // portada "Resumen día X" + placas de a 4 destacados
    const lineas = dia.resumen.destacados.filter((b) => b.partes && b.tipo !== "link");
    const bloques = [];
    lineas.forEach((b, i) => { if (i % 4 === 0) bloques.push({ tipo: "sub", partes: [{ t: i ? "Destacados (sigue)" : "Destacados del día" }] }); bloques.push({ ...b, tipo: "texto" }); });
    Graficas.desdeEvento({ deporte: "Resumen " + dia.titulo.replace(/^D[IÍ]A\b/i, "día").split(" - ")[0], evento: e.multi.nombre, bloques });
    estado.tab = "graficas"; dibujar(); window.scrollTo({ top: 0 });
  }));
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
  if (bPub.disabled) bPub.title = e.archivado ? "Ya se publicó (el agente lo sacó del Doc)" : "Ya figura como publicado (en gris) en el Doc";
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

function cajaFinal(e) {
  const t = document.createElement("article");
  t.className = "evento resumen-dia resumen-final abierto";
  t.innerHTML = `<div class="cabeza-fija"><span class="chip publicable">Resumen final de los Juegos</span><span class="titulo">${escapar(e.multi.nombre)}</span></div>
    <div class="detalle"><p class="posteo"></p></div>`;
  t.querySelector(".posteo").textContent = e.multi.resumen_final;
  const pie = document.createElement("div"); pie.className = "pie";
  pie.append(boton("Copiar posteo para IG", () =>
    copiarTexto(`${e.multi.resumen_final}\n\n${hashtagsEvento({ titulo: e.titulo }, [hashtag(e.multi.nombre)]).join(" ")}`)));
  if (window.Graficas) pie.append(boton("🎨 Gráfica", () => {
    // portada "Resumen final" + placas de a 2 oraciones (+ medallero si está)
    const oraciones = e.multi.resumen_final.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [];
    const bloques = [];
    const med = (e.multi.medallero || []).map((p) => p.t).join("").trim();
    if (med) bloques.push({ tipo: "sub", partes: [{ t: "Medallero" }] }, { tipo: "texto", partes: partesConNegrita(med.replace(/^medallero:\s*/i, "")) });
    oraciones.forEach((o, i) => { if (i % 2 === 0) bloques.push({ tipo: "sub", partes: [{ t: i ? "Resumen (sigue)" : "Lo mejor de los Juegos" }] }); bloques.push({ tipo: "texto", partes: [{ t: o }] }); });
    Graficas.desdeEvento({ deporte: "Resumen final", evento: e.multi.nombre, bloques });
    estado.tab = "graficas"; dibujar(); window.scrollTo({ top: 0 });
  }));
  const mini = { id: e.id + ":final", titulo: e.titulo + " - RESUMEN FINAL", bloques: [], version: huella(e.multi.resumen_final) };
  const bPub = boton("Publicado", null); bPub.className = "publicado"; pie.append(bPub); configurarPublicado(bPub, t, mini);
  t.append(pie);
  return t;
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

// ---------- noticias para publicar (no resultados) ----------
function miniNoticia(n) { return { id: "n:" + n.id, titulo: n.titulo, bloques: [], version: "1" }; }
function noticiasParaPublicar(conFiltros = true) {
  return noticiasFiltradas(conFiltros).filter((n) => n.noticia && (($("#ver-publicados").checked && conFiltros) || !estaPublicado(miniNoticia(n))));
}
function dibujarNoticias(lista) {
  const items = noticiasParaPublicar();
  if (!items.length) { lista.innerHTML = `<p class="vacio">No hay noticias nuevas. El bot las suma cada 3 horas.</p>`; return; }
  const tpl = $("#tpl-noticia");
  for (const n of items) {
    const t = tpl.content.firstElementChild.cloneNode(true);
    t.querySelector(".deporte").textContent = n.deporte;
    const tipo = t.querySelector(".tipo"); tipo.textContent = "📰 Noticia"; tipo.classList.add("otro");
    t.querySelector(".ba").hidden = !n.en_buenos_aires;
    const a = t.querySelector("h2 a"); a.href = n.link; a.textContent = n.titulo;
    t.querySelector(".meta").textContent = `${n.fuente || ""} · ${haceCuanto(n.publicado || n.encontrado)}`;
    if (n.resumen && !n.resumen.startsWith(n.titulo.slice(0, 30))) { const r = document.createElement("p"); r.className = "resumen-noticia"; r.textContent = n.resumen.slice(0, 220); t.append(r); }
    const pie = document.createElement("div"); pie.className = "pie";
    pie.append(boton("Copiar título y link", () => copiarTexto(`${n.titulo}\n${n.link}`, "Copiado")));
    if (window.Graficas) pie.append(boton("🎨 Gráfica", () => {
      // portada con el deporte + el título de la noticia; placa con el resumen (si trae algo más que el título)
      const extra = n.resumen && !n.resumen.startsWith(n.titulo.slice(0, 30)) ? n.resumen.slice(0, 400) : "";
      const bloques = [{ tipo: "sub", partes: [{ t: "Noticia" }] }, { tipo: "texto", partes: [{ t: n.titulo + (extra ? "\n" + extra : "") }] }];
      // título corto para la portada: hasta los dos puntos y como mucho ~50 letras (se puede editar)
      let corto = n.titulo.split(/\s*[:|–—]\s*/)[0];
      if (corto.length > 52) corto = corto.slice(0, 52).replace(/\s+\S*$/, "") + "…";
      Graficas.desdeEvento({ deporte: n.deporte, evento: "", bloques }, { titulo: corto });
      estado.tab = "graficas"; dibujar(); window.scrollTo({ top: 0 });
    }));
    const bPub = boton("Ya está", null); bPub.className = "publicado"; pie.append(bPub);
    configurarPublicado(bPub, t, miniNoticia(n));
    bPub.textContent = bPub.classList.contains("marcado") ? "✓ Ya está" : "Ya está";
    t.append(pie);
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
["#buscar", "#deporte"].forEach((s) => $(s).addEventListener("input", dibujar));
$("#ver-publicados").addEventListener("change", dibujar);
$("#rango").addEventListener("change", dibujar);
$("#recargar").onclick = cargar;
// modo noche: el botón alterna claro/noche; si nunca se tocó, sigue lo que tenga el celu/compu
function temaActual() {
  return document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
function pintarBotonTema() {
  const noche = temaActual() === "dark";
  $("#tema").textContent = noche ? "☀️" : "🌙";
  $("#tema").title = noche ? "Modo día" : "Modo noche";
  document.querySelector('meta[name="theme-color"]').content = noche ? "#0E1622" : "#F6F3EC";
}
$("#tema").onclick = () => {
  const nuevo = temaActual() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nuevo;
  try { localStorage.setItem("ad-tema", nuevo); } catch {}
  pintarBotonTema();
};
pintarBotonTema();
document.addEventListener("visibilitychange", () => { if (!document.hidden) cargar(); });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {});
  // cuando se instala una versión nueva del panel, se recarga sola una vez
  let recargado = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!recargado) { recargado = true; location.reload(); } });
}
// la base compartida avisa cuando cambian los publicados (de este u otro dispositivo)
window.alCambiarPublicados = (mapa) => { estado.publicados = mapa ?? leerPublicados(); dibujar(); };
window.alCambiarAgregados = (filas) => { estado.agregadosBase = filas; combinar(); dibujar(); };
window.alCambiarContactos = (mapa) => { estado.contactos = mapa; if (estado.tab === "ba" && !document.querySelector(".acred-form")) dibujar(); };
window.alCambiarAcred = (filas) => {
  // no redibujar mientras alguien escribe el pedido
  estado.acred = filas;
  if (estado.tab === "ba" && !document.querySelector(".acred-form")) dibujar();
};
window.alCambiarManuales = (filas) => { estado.manualesBase = filas; combinar(); llenarDeportes(); dibujar(); };
window.Base?.iniciar();
cargar();
