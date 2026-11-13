// EDITOR DE GRÁFICAS – copia de las plantillas de Canva ("Nuevas graficas") para editarlas desde el panel.
// Cambiás textos y fotos, y descargás las imágenes listas para Instagram (1080 px de ancho).
// Todo pasa en el teléfono/compu: las fotos no se suben a ningún lado.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const br = (s) => esc(s).replace(/\n/g, "<br>");
  const TAM = { feed: [1080, 1350], story: [1080, 1920] };
  const LIBRERIA = "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js";
  const FUENTES = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;600;700&display=swap";

  // ---------- campos de cada tipo de página ----------
  const C = {
    deporte: { label: "Deporte", ej: "Básquet 3x3" },
    torneo: { label: "Torneo", ej: "Americup - El Salvador" },
    instancia: { label: "Instancia", ej: "Cuartos de final" },
    titulo: { label: "Título", ej: "Argentina entre los ocho mejores del continente", area: true },
    texto: { label: "Texto", ej: "En ambas ramas…", area: true },
    credito: { label: "Crédito de la foto", ej: "CAB" },
    tam: { label: "Tamaño del texto", rango: [60, 150, 5] },
  };
  const TIPOS = {
    portada: { formato: "feed", nombre: "Portada", campos: ["deporte", "torneo", "titulo", "credito"] },
    placa: { formato: "feed", nombre: "Placa de texto", campos: ["titulo", "texto", "tam", "credito",
      { k: "fondo", label: "Fondo", opciones: [["oscuro", "Oscuro"], ["claro", "Claro"]] },
      { k: "acento", label: "Color del número", opciones: [["celeste", "Celeste"], ["naranja", "Naranja"], ["dorado", "Dorado"]] } ] },
    medalla: { formato: "feed", nombre: "Portada medalla", campos: [
      { k: "prueba", label: "Deporte · prueba", ej: "Natación · 200 m espalda" }, { k: "nombre", label: "Deportista", ej: "Cecilia Dieleke" },
      { k: "medalla", label: "Medalla", opciones: [["oro", "Dorada"], ["plata", "Plateada"], ["bronce", "Bronce"]] },
      { k: "evento", label: "Evento", ej: "Dakar 2026 - Juegos Olímpicos de la Juventud" }, "credito"] },
    "s-portada": { formato: "story", nombre: "Historia portada", campos: ["deporte", "torneo", "instancia",
      { k: "linea1", label: "Título (línea blanca)", ej: "Argentina" }, { k: "linea2", label: "Título (línea celeste)", ej: "a la final" }, "credito"] },
    "s-texto": { formato: "story", nombre: "Historia con texto", campos: ["deporte", "torneo", "instancia", "titulo", "texto", "tam", "credito"] },
    "s-sets": { formato: "story", nombre: "Historia marcador por sets", campos: ["deporte", "torneo",
      { k: "arg", label: "Argentinos", ej: "García/Frascaroli" }, { k: "rival", label: "Rival", ej: "Paniagua/Reyes" },
      { k: "rival_pais", label: "País rival (3 letras)", ej: "DOM" }, { k: "sets", label: "Sets (ARG-rival, separados por coma)", ej: "21-16, 21-12" },
      { k: "frase", label: "Frase", ej: "¡A cuartos de final!" }, "credito"] },
    "s-partido": { formato: "story", nombre: "Historia partido", campos: ["deporte", "torneo", "instancia",
      { k: "gl", label: "Goles/puntos ARG", ej: "3" }, { k: "gv", label: "Goles/puntos rival", ej: "1" },
      { k: "rival_pais", label: "Rival (3 letras)", ej: "BRA" }, { k: "frase", label: "Frase", ej: "Victoria clave" },
      { k: "goleadores", label: "Goleadores / detalle", ej: "Nombre · 00' | Nombre · 00'" }, "credito"] },
    "s-posicion": { formato: "story", nombre: "Historia posición y marca", campos: ["deporte", "torneo", "instancia",
      { k: "prueba", label: "Prueba", ej: "Lanzamiento de jabalina" }, { k: "nombre", label: "Deportista", ej: "Nombre Apellido" },
      { k: "posicion", label: "Posición", ej: "3°" }, { k: "marca", label: "Marca", ej: "78,45 m" }, "credito"] },
  };

  // ---------- plantillas (como vienen de Canva) ----------
  const PLANTILLAS = {
    carrusel: { nombre: "Carrusel feed", paginas: () => [
      pag("portada", { deporte: "Básquet 3x3", torneo: "Americup - El Salvador", titulo: "Argentina entre los ocho mejores del continente", credito: "CAB" }),
      pag("placa", { titulo: "Femenino y masculino", texto: "En ambas ramas, los seleccionados argentinos se despidieron de la Americup en cuartos de final.", credito: "CAB" }),
      pag("placa", { titulo: "La final", texto: "El argentino largó tercero y en los últimos 500 metros pasó a sus rivales para quedarse con el oro.", credito: "Nombre Apellido / Agencia", fondo: "claro" }),
    ] },
    medalla: { nombre: "Medalla multideportivo", paginas: () => [
      pag("medalla", { prueba: "Natación · 200 m espalda", nombre: "Cecilia Dieleke", medalla: "oro", evento: "Dakar 2026 - Juegos Olímpicos de la Juventud", credito: "Olympics" }),
      pag("placa", { titulo: "La final", texto: "Ganó los 200 m espalda con 2:10.05: nuevo récord argentino y sudamericano.", credito: "Olympics", acento: "naranja" }),
      pag("placa", { titulo: "El momento", texto: "“Esto es lo que venía a buscar. Es un sueño cumplido.”\nCecilia Dieleke, 17 años.", credito: "Olympics", fondo: "claro", acento: "naranja" }),
    ] },
    historia: { nombre: "Historia portada + texto", paginas: () => [
      pag("s-portada", { deporte: "Tenis", torneo: "Copa Davis 2026", instancia: "Cuartos de final", linea1: "Argentina", linea2: "a la final", credito: "Nombre Apellido / Agencia" }),
      pag("s-texto", { deporte: "Tenis", torneo: "Copa Davis 2026", instancia: "Cuartos de final", titulo: "Histórico", texto: "Argentina volvió a demostrar su carácter en una jornada decisiva. El equipo ganó con autoridad y avanzó a la próxima instancia.", credito: "Nombre Apellido / Agencia" }),
    ] },
    sets: { nombre: "Historia por sets", paginas: () => [
      pag("s-sets", { deporte: "Beach vóley", torneo: "Dakar 2026", arg: "García/Frascaroli", rival: "Paniagua/Reyes", rival_pais: "DOM", sets: "21-16, 21-12", frase: "¡A cuartos de final!", credito: "FEVA" })] },
    partido: { nombre: "Historia partido", paginas: () => [
      pag("s-partido", { deporte: "Fútbol", torneo: "Torneo 2026", instancia: "Final", gl: "3", gv: "1", rival_pais: "BRA", frase: "Victoria clave", goleadores: "Nombre · 00' | Nombre · 00'", credito: "Nombre Apellido / Agencia" })] },
    posicion: { nombre: "Historia posición", paginas: () => [
      pag("s-posicion", { deporte: "Atletismo", torneo: "Grand Prix 2026", instancia: "Final", prueba: "Lanzamiento de jabalina", nombre: "Nombre Apellido", posicion: "3°", marca: "78,45 m", credito: "Nombre Apellido / Agencia" })] },
  };
  function pag(tipo, datos) { return { tipo, datos: { ...datos }, foto: { src: "", z: 1, x: 50, y: 50 } }; }

  // ---------- estado (se guarda el borrador en el dispositivo, sin las fotos) ----------
  let G = cargarBorrador() || nuevo("carrusel");
  function nuevo(id) { return { plantilla: id, paginas: PLANTILLAS[id].paginas(), sel: 0 }; }
  function cargarBorrador() { try { const g = JSON.parse(localStorage.getItem("ad-grafica") || "null"); return g && PLANTILLAS[g.plantilla] ? g : null; } catch { return null; } }
  function guardar() {
    try { localStorage.setItem("ad-grafica", JSON.stringify({ ...G, paginas: G.paginas.map((p) => ({ ...p, foto: { ...p.foto, src: "" } })) })); } catch {}
  }
  const formato = () => TIPOS[G.paginas[0].tipo].formato;

  // ---------- dibujo de cada página (tamaño real: 1080 de ancho) ----------
  function foto(p, clase = "") {
    const f = p.foto;
    const img = f.src ? `<img src="${f.src}" style="object-position:${f.x}% ${f.y}%;transform:scale(${f.z});transform-origin:${f.x}% ${f.y}%">`
      : `<div class="g-sinfoto">Foto (tocá "Subir foto")</div>`;
    return `<div class="g-foto ${clase}">${img}</div>`;
  }
  const credito = (d, clase = "") => d.credito ? `<div class="g-credito ${clase}">Foto: ${esc(d.credito)}</div>` : "";
  const marcaAD = (clase = "") => `<div class="g-ad ${clase}"><span>ARGENTINA</span> <b>DORADA</b></div>`;
  const num = (i) => String(i + 1).padStart(2, "0");
  const MEDALLAS = { oro: ["¡Medalla dorada!", "oro"], plata: ["¡Medalla plateada!", "plata"], bronce: ["¡Medalla de bronce!", "bronce"] };

  const DIBUJO = {
    portada: (p) => { const d = p.datos; return `${foto(p, "g-full")}<div class="g-degrade"></div>
      <div class="g-pt-arriba">${d.deporte ? `<span class="g-pill oro">${esc(d.deporte)}</span>` : ""}<div class="g-pt-torneo">${esc(d.torneo)}</div></div>
      <div class="g-logo-caja"><span>ARGENTINA</span><b>DORADA</b></div>
      <div class="g-pt-titulo" data-fit><div class="g-linea"></div><h1 data-fs="titulo">${br(d.titulo)}</h1></div>
      ${credito(d, "caja")}<div class="g-desliza">Deslizá <span>⟶</span></div>`; },
    placa: (p, i) => { const d = p.datos; return `<div class="g-placa ${d.fondo === "claro" ? "claro" : ""}">
      ${foto(p, "g-pl-foto")}${credito(d, "g-pl-cred")}
      <div class="g-pl-cuerpo" data-fit><div class="g-linea"></div><h2 data-fs="titulo">${br(d.titulo)}</h2><p data-fs="texto">${br(d.texto)}</p></div>
      ${marcaAD("g-pl-ad")}<div class="g-pl-num ${d.acento || "celeste"}">${num(i)}</div></div>`; },
    medalla: (p) => { const d = p.datos; const [txt, cls] = MEDALLAS[d.medalla] || MEDALLAS.oro; return `${foto(p, "g-full")}<div class="g-degrade suave"></div>
      <div class="g-md-prueba">${esc(d.prueba)}</div><div class="g-md-nombre">${esc(d.nombre)}</div>
      <div class="g-logo-caja blanca"><i>AD</i><span>ARGENTINA</span><b>DORADA</b></div>
      <h1 class="g-md-titulo ${cls}">${esc(txt)}</h1><div class="g-md-evento">${esc(d.evento)}</div>
      <div class="g-guarda"></div><div class="g-desliza naranja">Deslizá <span>⟶</span></div>${credito(d, "g-md-cred")}`; },
    "s-portada": (p) => { const d = p.datos; return `${foto(p, "g-full")}<div class="g-degrade story"></div>${marcaAD("g-s-head")}
      ${caja(d, "g-sp-caja")}<h1 class="g-sp-titulo"><span>${esc(d.linea1)}</span><span class="celeste">${esc(d.linea2)}</span></h1>
      <div class="g-marco"></div>${credito(d, "g-s-cred-abajo")}`; },
    "s-texto": (p) => { const d = p.datos; return `${marcaAD("g-s-head")}<div class="g-s-linea-top"></div>
      ${d.deporte ? `<span class="g-pill celeste g-st-pill">${esc(d.deporte)}</span>` : ""}${foto(p, "g-st-foto")}${credito(d, "g-st-cred")}
      <div class="g-st-caja"><b>${esc(d.torneo)}</b><span>${esc(d.instancia)}</span></div>
      <div class="g-st-abajo" data-fit><h1 class="g-st-titulo" data-fs="titulo">${br(d.titulo)}</h1><div class="g-st-texto"><div class="g-linea"></div><p data-fs="texto">${br(d.texto)}</p></div></div>`; },
    "s-sets": (p) => { const d = p.datos;
      const sets = String(d.sets || "").split(",").map((s) => s.split("-").map((n) => n.trim())).filter((s) => s.length === 2 && s[0] !== "");
      const cols = sets.map((_, i) => `<th>Set ${i + 1}</th>`).join("");
      return `${marcaAD("g-s-head")}<div class="g-ss-torneo">${esc(d.torneo)}</div>
      ${d.deporte ? `<span class="g-pill celeste g-ss-pill">${esc(d.deporte)}</span>` : ""}${credito(d, "g-ss-cred")}${foto(p, "g-ss-foto")}
      <table class="g-sets n${Math.min(sets.length, 5)}"><tr><th></th>${cols}</tr>
        <tr class="arg"><td>${esc(d.arg).replace(/\//g, "/<wbr>")}<small>(ARG)</small></td>${sets.map((s) => `<td>${esc(s[0])}</td>`).join("")}</tr>
        <tr><td>${esc(d.rival).replace(/\//g, "/<wbr>")}<small>(${esc(d.rival_pais)})</small></td>${sets.map((s) => `<td>${esc(s[1])}</td>`).join("")}</tr></table>
      <div class="g-frase"><div class="g-adorno"></div><h1>${esc(d.frase)}</h1><div class="g-adorno abajo"></div></div>`; },
    "s-partido": (p) => { const d = p.datos; return `${marcaAD("g-s-head")}${d.deporte ? `<span class="g-pill celeste g-centro g-sm-pill">${esc(d.deporte)}</span>` : ""}
      ${foto(p, "g-sm-foto")}${credito(d, "g-sm-cred")}<div class="g-sm-abajo" data-fit><div class="g-sm-caja"><b data-fs>${esc(d.torneo)}</b><span>${esc(d.instancia)}</span></div>
      <div class="g-marcador"><div class="eq arg">ARG</div><div class="res">${esc(d.gl)}<i>-</i>${esc(d.gv)}</div><div class="eq riv">${esc(d.rival_pais)}</div></div>
      <h1 class="g-sm-frase" data-fs>${esc(d.frase)}</h1>${d.goleadores ? `<div class="g-sm-gol"><span class="g-pill celeste">Goleadores</span><p data-fs>${esc(d.goleadores)}</p></div>` : ""}</div>`; },
    "s-posicion": (p) => { const d = p.datos; return `${marcaAD("g-s-head")}<div class="g-spo-cab">${d.deporte ? `<span class="g-pill celeste">${esc(d.deporte)}</span>` : ""}
      <div><b>${esc(d.torneo)}</b><span>${esc(d.instancia)}</span></div></div>${foto(p, "g-spo-foto")}${credito(d, "g-spo-cred")}
      <h2 class="g-spo-prueba">${esc(d.prueba)}</h2><div class="g-spo-nombre">${esc(d.nombre)}</div>
      <div class="g-spo-cajas"><div class="pos"><span>Posición</span><b>${esc(d.posicion)}</b></div><div class="mar"><span>Marca</span><b>${esc(d.marca)}</b></div></div>`; },
  };
  function caja(d, clase) {
    return `<div class="${clase}">${d.deporte ? `<span class="g-pill celeste">${esc(d.deporte)}</span>` : ""}
      ${d.torneo || d.instancia ? `<div class="g-caja-torneo"><b>${esc(d.torneo)}</b><span>${esc(d.instancia)}</span></div>` : ""}</div>`;
  }

  // si el texto no entra en su lugar, se achica la letra de a poco hasta que entre (y se aplica el "Tamaño de letra")
  function ajustar(pagina, p) {
    if (!pagina) return;
    const tam = (Number(p.datos.tam) || 100) / 100;
    for (const caja of pagina.querySelectorAll("[data-fit]")) {
      const grupo = (rol) => [...caja.querySelectorAll(`[data-fs="${rol}"]`), ...(rol === "titulo" ? caja.querySelectorAll('[data-fs=""]') : [])]
        .map((el) => [el, parseFloat(getComputedStyle(el).fontSize)]);
      const texto = grupo("texto"), titulo = grupo("titulo");
      const poner = (items, f) => items.forEach(([el, base]) => (el.style.fontSize = base * f + "px"));
      const sobra = () => caja.scrollHeight > caja.clientHeight + 2;
      // el "Tamaño del texto" solo cambia el desarrollo; si no entra, primero se achica el texto y después el título
      let ft = tam; poner(texto, ft);
      while (sobra() && texto.length && ft > 0.55) { ft *= 0.94; poner(texto, ft); }
      let fh = 1;
      while (sobra() && fh > 0.7) { fh *= 0.94; poner(titulo, fh); }
      while (sobra() && texto.length && ft > 0.3) { ft *= 0.94; poner(texto, ft); }
    }
  }

  function paginaHTML(p, i) {
    const [w, h] = TAM[TIPOS[p.tipo].formato];
    return `<div class="g-pagina g-${p.tipo}" style="width:${w}px;height:${h}px">${DIBUJO[p.tipo](p, i)}</div>`;
  }
  function escalada(p, i, ancho) {
    const [w, h] = TAM[TIPOS[p.tipo].formato], s = ancho / w;
    return `<div class="g-escala" style="width:${ancho}px;height:${Math.round(h * s)}px"><div style="transform:scale(${s});transform-origin:0 0">${paginaHTML(p, i)}</div></div>`;
  }

  // ---------- editor ----------
  let raiz = null;
  function dibujar(lista) {
    raiz = document.createElement("div");
    raiz.className = "g-editor";
    lista.append(raiz);
    lista.classList.add("modo-graficas");
    armar();
  }

  function armar() {
    if (G.sel >= G.paginas.length) G.sel = 0;
    const otros = Object.entries(TIPOS).filter(([, t]) => t.formato === formato());
    raiz.innerHTML = `
      <div class="g-plantillas" role="tablist">${Object.entries(PLANTILLAS).map(([id, t]) =>
        `<button data-p="${id}" class="${id === G.plantilla ? "activo" : ""}">${esc(t.nombre)}</button>`).join("")}</div>
      <div class="g-tira">${G.paginas.map((p, i) => `<button class="g-mini ${i === G.sel ? "activo" : ""}" data-i="${i}">${escalada(p, i, 92)}<span>${num(i)}</span></button>`).join("")}
        <div class="g-agregar"><select aria-label="Agregar página">${otros.map(([k, t]) => `<option value="${k}">${esc(t.nombre)}</option>`).join("")}</select><button class="g-mas">+ Página</button></div></div>
      <div class="g-trabajo"><div class="g-vista"></div><div class="g-campos"></div></div>
      <div class="g-acciones"><button class="g-bajar principal">⬇ Descargar ${G.paginas.length > 1 ? `las ${G.paginas.length} imágenes` : "imagen"}</button>
        <button class="g-reset">Volver a la plantilla</button></div>
      <p class="ayuda">Las fotos quedan solo en este dispositivo. Los textos se guardan como borrador acá mismo.</p>`;
    raiz.querySelectorAll(".g-plantillas button").forEach((b) => (b.onclick = () => {
      G = nuevo(b.dataset.p); guardar(); armar();
    }));
    raiz.querySelectorAll(".g-mini").forEach((b) => (b.onclick = () => { G.sel = Number(b.dataset.i); armar(); }));
    raiz.querySelector(".g-mas").onclick = () => {
      const tipo = raiz.querySelector(".g-agregar select").value;
      const base = G.paginas.at(-1);
      const nueva = pag(tipo, { credito: base.datos.credito, deporte: base.datos.deporte, torneo: base.datos.torneo, instancia: base.datos.instancia,
        acento: base.datos.acento, fondo: base.datos.fondo, titulo: "Título", texto: "Texto" });
      G.paginas.push(nueva); G.sel = G.paginas.length - 1; guardar(); armar();
    };
    raiz.querySelector(".g-bajar").onclick = descargar;
    raiz.querySelector(".g-reset").onclick = () => { G = nuevo(G.plantilla); guardar(); armar(); };
    raiz.querySelectorAll(".g-mini").forEach((m) => ajustar(m.querySelector(".g-pagina"), G.paginas[Number(m.dataset.i)]));
    vista(); campos();
  }

  function vista() {
    const v = raiz.querySelector(".g-vista");
    const ancho = Math.min(v.clientWidth || 360, formato() === "story" ? 340 : 420);
    const p = G.paginas[G.sel];
    v.innerHTML = escalada(p, G.sel, ancho);
    ajustar(v.querySelector(".g-pagina"), p);
    const mini = raiz.querySelector(`.g-mini[data-i="${G.sel}"]`);
    if (mini) { mini.querySelector(".g-escala").outerHTML = escalada(p, G.sel, 92); ajustar(mini.querySelector(".g-pagina"), p); }
  }

  function campos() {
    const p = G.paginas[G.sel], t = TIPOS[p.tipo];
    const caja = raiz.querySelector(".g-campos");
    const lista = t.campos.map((c) => (typeof c === "string" ? { k: c, ...C[c] } : c));
    caja.innerHTML = `<h3>${esc(t.nombre)} <small>${num(G.sel)}</small></h3>
      <div class="g-foto-ctrl"><label class="g-subir">📷 ${p.foto.src ? "Cambiar foto" : "Subir foto"}<input type="file" accept="image/*" hidden></label>
        ${p.foto.src ? `<label>Zoom<input type="range" data-f="z" min="1" max="3" step="0.05" value="${p.foto.z}"></label>
        <label>↔<input type="range" data-f="x" min="0" max="100" value="${p.foto.x}"></label>
        <label>↕<input type="range" data-f="y" min="0" max="100" value="${p.foto.y}"></label>` : ""}</div>
      ${lista.map((c) => {
        const v = p.datos[c.k] ?? "";
        if (c.rango) return `<label>${esc(c.label)}<input type="range" data-k="${c.k}" min="${c.rango[0]}" max="${c.rango[1]}" step="${c.rango[2]}" value="${v || 100}"></label>`;
        if (c.opciones) return `<label>${esc(c.label)}<select data-k="${c.k}">${c.opciones.map(([val, txt]) => `<option value="${val}" ${val === (v || c.opciones[0][0]) ? "selected" : ""}>${esc(txt)}</option>`).join("")}</select></label>`;
        return `<label>${esc(c.label)}${c.area ? `<textarea data-k="${c.k}" rows="3" placeholder="${esc(c.ej || "")}">${esc(v)}</textarea>` : `<input data-k="${c.k}" value="${esc(v)}" placeholder="${esc(c.ej || "")}">`}</label>`;
      }).join("")}
      <div class="g-pag-acc">${G.sel > 0 ? `<button class="g-izq">◀ Mover</button>` : ""}${G.sel < G.paginas.length - 1 ? `<button class="g-der">Mover ▶</button>` : ""}
        ${G.paginas.length > 1 ? `<button class="g-quitar">Quitar página</button>` : ""}</div>`;
    caja.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("input", () => { p.datos[el.dataset.k] = el.value; vista(); guardar(); }));
    caja.querySelectorAll("[data-f]").forEach((el) => el.addEventListener("input", () => { p.foto[el.dataset.f] = Number(el.value); vista(); }));
    caja.querySelector("input[type=file]").onchange = (ev) => {
      const archivo = ev.target.files[0]; if (!archivo) return;
      achicar(archivo).then((src) => { p.foto = { src, z: 1, x: 50, y: 50 }; vista(); campos(); });
    };
    const mover = (d) => { const [x] = G.paginas.splice(G.sel, 1); G.sel += d; G.paginas.splice(G.sel, 0, x); guardar(); armar(); };
    caja.querySelector(".g-izq")?.addEventListener("click", () => mover(-1));
    caja.querySelector(".g-der")?.addEventListener("click", () => mover(1));
    caja.querySelector(".g-quitar")?.addEventListener("click", () => { G.paginas.splice(G.sel, 1); G.sel = Math.max(0, G.sel - 1); guardar(); armar(); });
  }

  // las fotos del celu son enormes: se achican a 2000 px para que la descarga sea rápida
  function achicar(archivo) {
    return new Promise((ok) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 2000 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src); ok(c.toDataURL("image/jpeg", 0.9));
      };
      img.src = URL.createObjectURL(archivo);
    });
  }

  // ---------- descarga ----------
  function cargarLibreria() {
    if (window.htmlToImage) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement("script"); s.src = LIBRERIA; s.onload = ok; s.onerror = mal; document.head.append(s); });
  }
  // las letras de la marca (Bebas Neue y Montserrat) se meten adentro de la imagen; si no, saldría con letra común
  let fuentesCSS = null;
  async function aDataURL(url) {
    const blob = await (await fetch(url)).blob();
    return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
  }
  async function cssFuentes() {
    if (fuentesCSS !== null) return fuentesCSS;
    try {
      let css = await (await fetch(FUENTES)).text();
      // Google manda un bloque por idioma: nos quedamos con latín (castellano)
      if (css.includes("/*")) css = css.split("/*").filter((b) => /^\s*latin(-ext)?\s*\*\//.test(b)).map((b) => "/*" + b).join("\n");
      const urls = [...new Set([...css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)].map((m) => m[2]))];
      for (const u of urls) css = css.split(u).join(await aDataURL(u));
      fuentesCSS = css;
    } catch { fuentesCSS = undefined; }
    return fuentesCSS;
  }

  async function descargar() {
    const b = raiz.querySelector(".g-bajar"); const txt = b.textContent;
    b.disabled = true; b.textContent = "Armando las imágenes…";
    const taller = document.createElement("div"); taller.className = "g-taller";
    document.body.append(taller);
    try {
      await cargarLibreria(); await document.fonts.ready;
      const fontEmbedCSS = await cssFuentes();
      const archivos = [];
      for (const [i, p] of G.paginas.entries()) {
        taller.innerHTML = paginaHTML(p, i);
        const nodo = taller.firstElementChild;
        ajustar(nodo, p);
        await Promise.all([...nodo.querySelectorAll("img")].map((im) => im.decode().catch(() => {})));
        const [w, h] = TAM[TIPOS[p.tipo].formato];
        const blob = await htmlToImage.toBlob(nodo, { width: w, height: h, pixelRatio: 1, fontEmbedCSS });
        archivos.push(new File([blob], `argentina-dorada-${G.plantilla}-${num(i)}.png`, { type: "image/png" }));
      }
      // en el celu: se abre "Compartir" (guardar en la galería o mandar directo a Instagram)
      if (navigator.canShare?.({ files: archivos }) && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ files: archivos }).catch(() => {});
      } else {
        for (const f of archivos) {
          const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click();
          await new Promise((r) => setTimeout(r, 300)); URL.revokeObjectURL(a.href);
        }
      }
    } catch (e) {
      console.error(e); alertar("No se pudieron armar las imágenes. Probá de nuevo.");
    } finally { taller.remove(); b.disabled = false; b.textContent = txt; }
  }
  function alertar(t) { const a = $("#aviso"); if (!a) return; a.textContent = t; a.hidden = false; setTimeout(() => (a.hidden = true), 2500); }

  // ---------- desde un resultado: arma el carrusel con los datos del evento ----------
  function limpio(partes) {
    return partes.filter((x) => !x.href).map((x) => x.t).join("").replace(/https?:\/\/\S+/g, "").replace(/\(\s*\)/g, "").replace(/\s+/g, " ").trim();
  }
  // opciones.medalla(partes) -> {clave: "oro"|"plata"|"bronce"} si la línea tiene una medalla en negrita
  function desdeEvento(e, opciones = {}) {
    const placas = [];
    let actual = null, medalla = null;
    for (const b of e.bloques || []) {
      if (!b.partes) continue;
      const txt = limpio(b.partes);
      if (!txt) continue;
      if (!medalla && opciones.medalla && (b.tipo === "texto" || b.tipo === "sub")) {
        const m = opciones.medalla(b.partes);
        if (m) medalla = { clave: m.clave, texto: txt };
      }
      if (b.tipo === "sub") { actual = { titulo: txt, texto: [] }; placas.push(actual); }
      else if (b.tipo === "texto") { if (!actual) { actual = { titulo: "", texto: [] }; placas.push(actual); } actual.texto.push(txt); }
    }
    const acento = medalla ? "naranja" : undefined;
    const lasPlacas = placas.slice(0, 6).map((pl) => pag("placa", { titulo: pl.titulo || "Resultado", texto: pl.texto.join("\n").slice(0, 700), credito: "", acento }));
    if (medalla) {
      // "Cecilia Dieleke ganó la medalla..." -> nombre = lo que está antes del verbo
      const m = medalla.texto.match(/^(.+?)\s+(gan[oó]|logr[oó]|se (colg[oó]|qued[oó]|consagr[oó]|llev[oó])|conquist[oó]|obtuvo|consigui[oó]|fue|termin[oó]|sum[oó])(?=\s|$)/i);
      G = { plantilla: "medalla", sel: 0, paginas: [pag("medalla", { prueba: e.deporte || "", nombre: m ? m[1].replace(/\(.*?\)/g, "").trim() : "",
        medalla: medalla.clave, evento: e.evento || e.titulo || "", credito: "" }), ...lasPlacas] };
    } else {
      G = { plantilla: "carrusel", sel: 0, paginas: [pag("portada", { deporte: e.deporte || "", torneo: e.evento || e.titulo || "", titulo: opciones.titulo || "", credito: "" }), ...lasPlacas] };
    }
    if (G.paginas.length === 1) G.paginas.push(pag("placa", { titulo: "Título", texto: "", credito: "", acento }));
    guardar();
  }

  window.Graficas = { dibujar, desdeEvento };
})();
