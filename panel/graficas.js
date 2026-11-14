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
    convocados: { formato: "feed", nombre: "Convocados", campos: ["deporte", "torneo",
      { k: "titulo", label: "Título", ej: "Convocadas" },
      { k: "lista", label: "Lista (una persona por línea; con \" - \" podés sumar club o puesto)", ej: "Nombre Apellido - Club", area: true, filas: 10 },
      { k: "dt", label: "Entrenador/a (opcional)", ej: "Fernando Ferrara" }, "credito"] },
    grupos: { formato: "feed", nombre: "Grupos", sinFoto: true, campos: ["deporte", "torneo", "instancia",
      { k: "grupos", label: "Grupos (uno por línea: \"Grupo A: Argentina, Brasil, Chile\")", ej: "Grupo A: Argentina, Brasil, Chile, Perú", area: true, filas: 8 }] },
    fixture: { formato: "story", nombre: "Fixture", sinFoto: true, campos: ["deporte", "torneo",
      { k: "partidos", label: "Partidos (uno por línea: fecha | hora | rival (sigla) | instancia)", ej: "Sáb 15/11 | 15:00 | Brasil (BRA) | Fase de grupos", area: true, filas: 8 },
      { k: "nota", label: "Nota (opcional)", ej: "Horarios de Argentina · TV: DSports" }] },
    agenda: { formato: "story", nombre: "Agenda del día", sinFoto: true, campos: [
      { k: "titulo", label: "Título", ej: "Agenda del día" }, { k: "fecha", label: "Día", ej: "Sábado 15/11" }, "torneo",
      { k: "items", label: "Agenda (uno por línea: hora | deporte | quién y qué)", ej: "10:00 | Natación | Agostina Hein - 400 m libre (final)", area: true, filas: 10 },
      { k: "nota", label: "Nota (opcional)", ej: "Horarios de Argentina" }] },
    clasificados: { formato: "feed", nombre: "Clasificados", campos: [
      { k: "titulo", label: "Título", ej: "Clasificados a Los Ángeles 2028" },
      { k: "lista", label: "Clasificados (uno por línea: deporte | quién)", ej: "Hockey | Las Leonas", area: true, filas: 10 },
      { k: "total", label: "Número grande (vacío = cuenta la lista)", ej: "" }, { k: "etiqueta", label: "Debajo del número", ej: "plazas" },
      { k: "nuevo", label: "Último en sumarse (opcional)", ej: "Rugby 7 · Los Pumas 7s" }, "credito"] },
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
    convocados: { nombre: "Convocados", paginas: () => [
      pag("convocados", { deporte: "Hockey", torneo: "Pro League 2026", titulo: "Convocadas", dt: "Fernando Ferrara",
        lista: "Cristina Cosentino - GK\nAgustina Gorzelany\nValentina Raposo\nVictoria Sauze\nAgustina Albertarrio\nMaría José Granatto\nJulieta Jankunas\nRocío Sánchez Moccia\nSofía Toccalino\nEugenia Trinchinetti", credito: "CAH" })] },
    grupos: { nombre: "Grupos", paginas: () => [
      pag("grupos", { deporte: "Básquet", torneo: "AmeriCup 2026", instancia: "Así quedaron los grupos",
        grupos: "Grupo A: Argentina, Brasil, Uruguay, Panamá\nGrupo B: Estados Unidos, Canadá, México, Colombia\nGrupo C: Puerto Rico, Venezuela, Dominicana, Chile" })] },
    fixture: { nombre: "Fixture", paginas: () => [
      pag("fixture", { deporte: "Básquet", torneo: "AmeriCup 2026",
        partidos: "Sáb 15/11 | 15:00 | Brasil (BRA) | Fase de grupos\nLun 17/11 | 18:30 | Uruguay (URU) | Fase de grupos\nMié 19/11 | 21:00 | Panamá (PAN) | Fase de grupos", nota: "Horarios de Argentina" })] },
    agenda: { nombre: "Agenda del día", paginas: () => [
      pag("agenda", { titulo: "Agenda del día", fecha: "Sábado 15/11", torneo: "Dakar 2026",
        items: "08:30 | Natación | Agostina Hein - 400 m libre (series)\n10:00 | Judo | Nombre Apellido - -57 kg\n13:00 | Hockey 5 | Las Leoncitas vs India\n17:30 | Atletismo | Nombre Apellido - salto en largo (final)", nota: "Horarios de Argentina" })] },
    clasificados: { nombre: "Clasificados LA 2028", paginas: () => [
      pag("clasificados", { titulo: "Clasificados a Los Ángeles 2028", etiqueta: "plazas aseguradas", nuevo: "Hockey · Las Leonas",
        lista: "Hockey | Las Leonas\nHockey | Los Leones\nVóley | La Selección\nTiro | Nombre Apellido", credito: "COA" })] },
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
      <div class="g-pt-arriba">${d.deporte ? `<span class="g-pill oro">${esc(d.deporte)}</span>` : ""}<div class="g-pt-torneo" data-lineas="2">${esc(d.torneo)}</div></div>
      <div class="g-logo-caja"><span>ARGENTINA</span><b>DORADA</b></div>
      <div class="g-pt-titulo" data-fit><div class="g-linea"></div><h1 data-fs="titulo" data-ancho>${br(d.titulo)}</h1></div>
      ${credito(d, "caja")}<div class="g-desliza">Deslizá <span>⟶</span></div>`; },
    placa: (p, i) => { const d = p.datos; return `<div class="g-placa ${d.fondo === "claro" ? "claro" : ""}">
      ${foto(p, "g-pl-foto")}${credito(d, "g-pl-cred")}
      <div class="g-pl-cuerpo" data-fit><div class="g-linea"></div><h2 data-fs="titulo" data-ancho>${br(d.titulo)}</h2><p data-fs="texto">${br(d.texto)}</p></div>
      ${marcaAD("g-pl-ad")}<div class="g-pl-num ${d.acento || "celeste"}">${num(i)}</div></div>`; },
    medalla: (p) => { const d = p.datos; const [txt, cls] = MEDALLAS[d.medalla] || MEDALLAS.oro; return `${foto(p, "g-full")}<div class="g-degrade suave"></div>
      <div class="g-md-prueba">${esc(d.prueba)}</div><div class="g-md-nombre">${esc(d.nombre)}</div>
      <div class="g-logo-caja blanca"><i>AD</i><span>ARGENTINA</span><b>DORADA</b></div>
      <h1 class="g-md-titulo ${cls}" data-ancho>${esc(txt)}</h1><div class="g-md-evento">${esc(d.evento)}</div>
      <div class="g-guarda"></div><div class="g-desliza naranja">Deslizá <span>⟶</span></div>${credito(d, "g-md-cred")}`; },
    "s-portada": (p) => { const d = p.datos; return `${foto(p, "g-full")}<div class="g-degrade story"></div>${marcaAD("g-s-head")}
      ${caja(d, "g-sp-caja")}<div class="g-sp-zona" data-fit><h1 class="g-sp-titulo" data-ancho><span data-fs="titulo">${esc(d.linea1)}</span><span class="celeste" data-fs="titulo">${esc(d.linea2)}</span></h1></div>
      <div class="g-marco"></div>${credito(d, "g-s-cred-abajo")}`; },
    "s-texto": (p) => { const d = p.datos; return `${marcaAD("g-s-head")}<div class="g-s-linea-top"></div>
      ${d.deporte ? `<span class="g-pill celeste g-st-pill">${esc(d.deporte)}</span>` : ""}${foto(p, "g-st-foto")}${credito(d, "g-st-cred")}
      <div class="g-st-caja"><b data-lineas="2">${esc(d.torneo)}</b><span>${esc(d.instancia)}</span></div>
      <div class="g-st-abajo" data-fit><h1 class="g-st-titulo" data-fs="titulo" data-ancho>${br(d.titulo)}</h1><div class="g-st-texto"><div class="g-linea"></div><p data-fs="texto">${br(d.texto)}</p></div></div>`; },
    "s-sets": (p) => { const d = p.datos;
      const sets = String(d.sets || "").split(",").map((s) => s.split("-").map((n) => n.trim())).filter((s) => s.length === 2 && s[0] !== "");
      const cols = sets.map((_, i) => `<th>Set ${i + 1}</th>`).join("");
      return `${marcaAD("g-s-head")}<div class="g-ss-cab"><div class="g-ss-torneo" data-lineas="2">${esc(d.torneo)}</div>
      ${d.deporte ? `<span class="g-pill celeste g-ss-pill">${esc(d.deporte)}</span>` : ""}</div>${credito(d, "g-ss-cred")}${foto(p, "g-ss-foto")}
      <div class="g-ss-abajo" data-fit><table class="g-sets n${Math.min(sets.length, 5)}"><tr><th></th>${cols}</tr>
        <tr class="arg"><td><span data-ancho>${esc(d.arg).replace(/([\/-])/g, "$1<wbr>")}</span><small>(ARG)</small></td>${sets.map((s) => `<td>${esc(s[0])}</td>`).join("")}</tr>
        <tr><td><span data-ancho>${esc(d.rival).replace(/([\/-])/g, "$1<wbr>")}</span><small>(${esc(d.rival_pais)})</small></td>${sets.map((s) => `<td>${esc(s[1])}</td>`).join("")}</tr></table>
      ${d.frase ? `<div class="g-frase"><div class="g-adorno"></div><h1 data-fs="titulo" data-ancho>${esc(d.frase)}</h1><div class="g-adorno abajo"></div></div>` : ""}</div>`; },
    "s-partido": (p) => { const d = p.datos; return `${marcaAD("g-s-head")}${d.deporte ? `<span class="g-pill celeste g-centro g-sm-pill">${esc(d.deporte)}</span>` : ""}
      ${foto(p, "g-sm-foto")}${credito(d, "g-sm-cred")}<div class="g-sm-abajo" data-fit><div class="g-sm-caja"><b data-lineas="2">${esc(d.torneo)}</b><span>${esc(d.instancia)}</span></div>
      <div class="g-marcador"><div class="eq arg">ARG</div><div class="res">${esc(d.gl)}<i>-</i>${esc(d.gv)}</div><div class="eq riv">${esc(d.rival_pais)}</div></div>
      <h1 class="g-sm-frase" data-fs data-ancho>${esc(d.frase)}</h1>${d.goleadores ? `<div class="g-sm-gol"><span class="g-pill celeste">Goleadores</span><p data-fs>${esc(d.goleadores)}</p></div>` : ""}</div>`; },
    "s-posicion": (p) => { const d = p.datos; return `${marcaAD("g-s-head")}<div class="g-spo-cab">${d.deporte ? `<span class="g-pill celeste">${esc(d.deporte)}</span>` : ""}
      <div><b data-lineas="2">${esc(d.torneo)}</b><span>${esc(d.instancia)}</span></div></div>${foto(p, "g-spo-foto")}${credito(d, "g-spo-cred")}
      <h2 class="g-spo-prueba" data-ancho>${esc(d.prueba)}</h2><div class="g-spo-nombre">${esc(d.nombre)}</div>
      <div class="g-spo-cajas"><div class="pos"><span>Posición</span><b>${esc(d.posicion)}</b></div><div class="mar"><span>Marca</span><b>${esc(d.marca)}</b></div></div>`; },
    convocados: (p) => { const d = p.datos; const gente = lineas(d.lista);
      return `${foto(p, "g-cv-foto")}<div class="g-cv-degrade"></div>
      <div class="g-pt-arriba">${d.deporte ? `<span class="g-pill oro">${esc(d.deporte)}</span>` : ""}<div class="g-pt-torneo" data-lineas="2">${esc(d.torneo)}</div></div>
      <div class="g-logo-caja"><span>ARGENTINA</span><b>DORADA</b></div>
      <div class="g-cv-cuerpo" data-fit><h1 data-fs="titulo" data-ancho>${esc(d.titulo)}</h1><div class="g-linea"></div>
        <ol class="g-cv-lista ${gente.length > 9 ? "dos" : ""}" data-fs="texto">${gente.map((g) => { const [n, x] = g.split(/\s+-\s+/); return `<li><b>${esc(n)}</b>${x ? `<span>${esc(x)}</span>` : ""}</li>`; }).join("")}</ol>
        ${d.dt ? `<p class="g-cv-dt" data-fs="texto"><span>DT</span> ${esc(d.dt)}</p>` : ""}</div>
      ${credito(d, "g-cv-cred")}`; },
    grupos: (p) => { const d = p.datos;
      const gs = lineas(d.grupos).map((l) => { const [n, r] = l.includes(":") ? [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1)] : ["", l]; return { n: n.trim(), eq: r.split(",").map((x) => x.trim()).filter(Boolean) }; });
      return `${marcaAD("g-s-head g-gr-head")}<div class="g-gr-cab">${d.deporte ? `<span class="g-pill celeste">${esc(d.deporte)}</span>` : ""}
        <div class="g-gr-torneo" data-lineas="2">${esc(d.torneo)}</div>${d.instancia ? `<div class="g-gr-inst">${esc(d.instancia)}</div>` : ""}</div>
      <div class="g-gr-zona" data-fit><div class="g-gr-grilla n${Math.min(gs.length, 8)}" data-fs="texto">${gs.map((g) => `<div class="g-gr-caja ${g.eq.some(esArg) ? "arg" : ""}">
        <b>${esc(g.n || "Grupo")}</b><ul>${g.eq.map((x) => `<li class="${esArg(x) ? "arg" : ""}">${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div></div>`; },
    fixture: (p) => { const d = p.datos;
      const ps = lineas(d.partidos).map((l) => l.split("|").map((x) => x.trim()));
      return `${marcaAD("g-s-head")}<div class="g-fx-cab">${d.deporte ? `<span class="g-pill celeste">${esc(d.deporte)}</span>` : ""}<div class="g-fx-torneo" data-lineas="2">${esc(d.torneo)}</div></div>
      <h1 class="g-fx-titulo" data-ancho>Fixture</h1>
      <div class="g-fx-zona" data-fit><div class="g-fx-lista" data-fs="texto">${ps.map(([fe, ho, ri, ins]) => { const sig = ((ri || "").match(/\(([A-Za-z]{3})\)/) || [])[1];
        return `<div class="g-fx-fila"><div class="fe">${esc(fe || "")}</div><div class="vs"><b>ARG <i>vs</i> ${esc(sig ? sig.toUpperCase() : ri || "")}</b>${sig ? `<span>${esc(ri.replace(/\s*\([^)]*\)/, ""))}${ins ? " · " + esc(ins) : ""}</span>` : ins ? `<span>${esc(ins)}</span>` : ""}</div><div class="ho">${esc(ho || "")}</div></div>`; }).join("")}</div>
        ${d.nota ? `<p class="g-fx-nota" data-fs="texto">${esc(d.nota)}</p>` : ""}</div>`; },
    agenda: (p) => { const d = p.datos;
      const its = lineas(d.items).map((l) => l.split("|").map((x) => x.trim()));
      return `${marcaAD("g-s-head")}<div class="g-ag-cab">${d.fecha ? `<span class="g-pill oro">${esc(d.fecha)}</span>` : ""}${d.torneo ? `<div class="g-ag-torneo" data-lineas="2">${esc(d.torneo)}</div>` : ""}</div>
      <h1 class="g-ag-titulo" data-ancho>${esc(d.titulo)}</h1>
      <div class="g-ag-zona" data-fit><div class="g-ag-lista" data-fs="texto">${its.map(([ho, dep, det]) => `<div class="g-ag-fila"><div class="ho">${esc(ho || "")}</div>
        <div class="tx"><b>${esc(det === undefined ? "" : dep || "")}</b><span>${esc(det === undefined ? dep || "" : det)}</span></div></div>`).join("")}</div>
        ${d.nota ? `<p class="g-fx-nota" data-fs="texto">${esc(d.nota)}</p>` : ""}</div>`; },
    clasificados: (p) => { const d = p.datos; const cl = lineas(d.lista).map((l) => l.split("|").map((x) => x.trim()));
      const total = String(d.total || "").trim() || String(cl.length);
      return `${foto(p, "g-cl-foto")}<div class="g-cv-degrade"></div><div class="g-logo-caja"><span>ARGENTINA</span><b>DORADA</b></div>
      <div class="g-cv-cuerpo g-cl-cuerpo" data-fit><div class="g-cl-top"><div class="g-cl-numero"><b>${esc(total)}</b><span>${esc(d.etiqueta || "")}</span></div>
        <h1 data-fs="titulo" data-ancho>${esc(d.titulo)}</h1></div><div class="g-linea"></div>
        ${d.nuevo ? `<p class="g-cl-nuevo" data-fs="texto"><span>Se sumó</span> ${esc(d.nuevo)}</p>` : ""}
        <ul class="g-cl-lista ${cl.length > 8 ? "dos" : ""}" data-fs="texto">${cl.map(([a, b]) => `<li>${b !== undefined ? `<span>${esc(a)}</span><b>${esc(b)}</b>` : `<b>${esc(a)}</b>`}</li>`).join("")}</ul></div>
      ${credito(d, "g-cv-cred")}`; },
  };
  const lineas = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const esArg = (s) => /argentin|\bARG\b/i.test(s);
  function caja(d, clase) {
    return `<div class="${clase}">${d.deporte ? `<span class="g-pill celeste">${esc(d.deporte)}</span>` : ""}
      ${d.torneo || d.instancia ? `<div class="g-caja-torneo"><b data-lineas="2">${esc(d.torneo)}</b><span>${esc(d.instancia)}</span></div>` : ""}</div>`;
  }

  // si el texto no entra en su lugar, se achica la letra de a poco hasta que entre (y se aplica el "Tamaño de letra")
  function ajustar(pagina, p) {
    if (!pagina) return;
    for (const el of pagina.querySelectorAll("[data-ancho]")) {
      el.style.fontSize = "";
      const celda = el.tagName === "SPAN" ? el.closest("td") || el.parentElement : el;
      let fs = parseFloat(getComputedStyle(el).fontSize);
      while (celda.scrollWidth > celda.clientWidth + 1 && fs > 20) { fs *= 0.94; el.style.fontSize = fs + "px"; }
    }
    for (const el of pagina.querySelectorAll("[data-lineas]")) {
      el.style.fontSize = "";
      const max = Number(el.dataset.lineas), cs = getComputedStyle(el);
      let fs = parseFloat(cs.fontSize);
      const alto = () => el.scrollHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const linea = () => (parseFloat(getComputedStyle(el).lineHeight) || fs * 1.2);
      while (alto() > linea() * max + 4 && fs > 18) { fs *= 0.94; el.style.fontSize = fs + "px"; }
    }
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
      ${G.origen ? `<p class="g-origen">Con los datos de <b>${esc(G.origen.evento || G.origen.deporte)}</b>. Tocá otra plantilla para pasarlos (feed o historia). <button class="g-soltar">Empezar de cero</button></p>` : ""}
      <div class="g-plantillas-caja"><button class="g-flecha izq" aria-label="Ver plantillas anteriores">◀</button>
      <div class="g-plantillas" role="tablist">${Object.entries(PLANTILLAS).map(([id, t]) =>
        `<button data-p="${id}" class="${id === G.plantilla ? "activo" : ""}">${esc(t.nombre)}</button>`).join("")}</div>
      <button class="g-flecha der" aria-label="Ver más plantillas">▶</button></div>
      <div class="g-tira">${G.paginas.map((p, i) => `<button class="g-mini ${i === G.sel ? "activo" : ""}" data-i="${i}">${escalada(p, i, 92)}<span>${num(i)}</span></button>`).join("")}
        <div class="g-agregar"><select aria-label="Agregar página">${otros.map(([k, t]) => `<option value="${k}">${esc(t.nombre)}</option>`).join("")}</select><button class="g-mas">+ Página</button></div></div>
      <div class="g-trabajo"><div class="g-vista"></div><div class="g-campos"></div></div>
      <div class="g-acciones"><button class="g-bajar principal">⬇ Descargar ${G.paginas.length > 1 ? `las ${G.paginas.length} imágenes` : "imagen"}</button>
        <button class="g-reset">Volver a la plantilla</button></div>
      <p class="ayuda">Las fotos quedan solo en este dispositivo. Los textos se guardan como borrador acá mismo.</p>`;
    raiz.querySelectorAll(".g-plantillas button").forEach((b) => (b.onclick = () => {
      // fotos ya subidas: se conservan en el mismo orden
      const fotos = G.paginas.map((p) => p.foto);
      G = G.origen ? armarDesde(G.origen, b.dataset.p) : nuevo(b.dataset.p);
      G.paginas.forEach((p, i) => { if (fotos[i]?.src) p.foto = fotos[i]; });
      guardar(); armar();
    }));
    // flechas para correr la fila de plantillas (en la compu no se puede arrastrar)
    const fila = raiz.querySelector(".g-plantillas"), izq = raiz.querySelector(".g-flecha.izq"), der = raiz.querySelector(".g-flecha.der");
    const flechas = () => { izq.disabled = fila.scrollLeft <= 2; der.disabled = fila.scrollLeft + fila.clientWidth >= fila.scrollWidth - 2;
      const ocultar = fila.scrollWidth <= fila.clientWidth + 2; izq.hidden = der.hidden = ocultar; };
    izq.onclick = () => fila.scrollBy({ left: -fila.clientWidth * 0.7 });
    der.onclick = () => fila.scrollBy({ left: fila.clientWidth * 0.7 });
    fila.addEventListener("scroll", flechas);
    fila.addEventListener("wheel", (ev) => { if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) { fila.scrollLeft += ev.deltaY; ev.preventDefault(); } }, { passive: false });
    const act = fila.querySelector(".activo");
    if (act) { fila.style.scrollBehavior = "auto"; fila.scrollLeft = act.offsetLeft - fila.offsetLeft - (fila.clientWidth - act.offsetWidth) / 2; fila.style.scrollBehavior = ""; }
    setTimeout(flechas, 0);
    raiz.querySelector(".g-soltar")?.addEventListener("click", () => { G = nuevo(G.plantilla); guardar(); armar(); });
    raiz.querySelectorAll(".g-mini").forEach((b) => (b.onclick = () => { G.sel = Number(b.dataset.i); armar(); }));
    raiz.querySelector(".g-mas").onclick = () => {
      const tipo = raiz.querySelector(".g-agregar select").value;
      const base = G.paginas.at(-1);
      const nueva = pag(tipo, { credito: base.datos.credito, deporte: base.datos.deporte, torneo: base.datos.torneo, instancia: base.datos.instancia,
        acento: base.datos.acento, fondo: base.datos.fondo, titulo: "Título", texto: "Texto" });
      G.paginas.push(nueva); G.sel = G.paginas.length - 1; guardar(); armar();
    };
    raiz.querySelector(".g-bajar").onclick = descargar;
    raiz.querySelector(".g-reset").onclick = () => { G = G.origen ? armarDesde(G.origen, G.plantilla) : nuevo(G.plantilla); guardar(); armar(); };
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
      ${t.sinFoto ? "" : `<div class="g-foto-ctrl"><label class="g-subir">📷 ${p.foto.src ? "Cambiar foto" : "Subir foto"}<input type="file" accept="image/*" hidden></label>
        ${p.foto.src ? `<label>Zoom<input type="range" data-f="z" min="1" max="3" step="0.05" value="${p.foto.z}"></label>
        <label>↔<input type="range" data-f="x" min="0" max="100" value="${p.foto.x}"></label>
        <label>↕<input type="range" data-f="y" min="0" max="100" value="${p.foto.y}"></label>` : ""}</div>`}
      ${lista.map((c) => {
        const v = p.datos[c.k] ?? "";
        if (c.rango) return `<label>${esc(c.label)}<input type="range" data-k="${c.k}" min="${c.rango[0]}" max="${c.rango[1]}" step="${c.rango[2]}" value="${v || 100}"></label>`;
        if (c.opciones) return `<label>${esc(c.label)}<select data-k="${c.k}">${c.opciones.map(([val, txt]) => `<option value="${val}" ${val === (v || c.opciones[0][0]) ? "selected" : ""}>${esc(txt)}</option>`).join("")}</select></label>`;
        return `<label>${esc(c.label)}${c.area ? `<textarea data-k="${c.k}" rows="${c.filas || 3}" placeholder="${esc(c.ej || "")}">${esc(v)}</textarea>` : `<input data-k="${c.k}" value="${esc(v)}" placeholder="${esc(c.ej || "")}">`}</label>`;
      }).join("")}
      <div class="g-pag-acc">${G.sel > 0 ? `<button class="g-izq">◀ Mover</button>` : ""}${G.sel < G.paginas.length - 1 ? `<button class="g-der">Mover ▶</button>` : ""}
        ${G.paginas.length > 1 ? `<button class="g-quitar">Quitar página</button>` : ""}</div>`;
    caja.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("input", () => { p.datos[el.dataset.k] = el.value; vista(); guardar(); }));
    caja.querySelectorAll("[data-f]").forEach((el) => el.addEventListener("input", () => { p.foto[el.dataset.f] = Number(el.value); vista(); }));
    const subir = caja.querySelector("input[type=file]");
    if (subir) subir.onchange = (ev) => {
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
    // se guarda de dónde salió, así se puede pasar a otra plantilla (carrusel, medalla, historias) con los mismos datos
    const origen = { deporte: e.deporte || "", evento: e.evento || e.titulo || "", bloques: (e.bloques || []).filter((b) => b.partes),
      titulo: opciones.titulo || "", medallaAuto: !!opciones.medalla };
    G = armarDesde(origen, opciones.plantilla);
    guardar();
  }

  function armarDesde(o, plantilla) {
    const placas = [], lineas = [];
    let actual = null, medalla = null;
    const fnMedalla = o.medallaAuto || plantilla === "medalla" ? window.tipoMedalla : null;
    for (const b of o.bloques) {
      const txt = limpio(b.partes);
      if (!txt) continue;
      if (b.tipo === "texto" || b.tipo === "sub") lineas.push(txt);
      if (!medalla && fnMedalla && (b.tipo === "texto" || b.tipo === "sub")) {
        const m = fnMedalla(b.partes);
        if (m) medalla = { clave: m.clave, texto: txt };
      }
      if (b.tipo === "sub") { actual = { titulo: txt, texto: [] }; placas.push(actual); }
      else if (b.tipo === "texto") { if (!actual) { actual = { titulo: "", texto: [] }; placas.push(actual); } actual.texto.push(txt); }
    }
    if (!plantilla) plantilla = medalla && o.medallaAuto ? "medalla" : "carrusel";
    const acento = plantilla === "medalla" ? "naranja" : undefined;
    const lasPlacas = placas.slice(0, 6).map((pl) => pag("placa", { titulo: pl.titulo || "Resultado", texto: pl.texto.join("\n").slice(0, 700), credito: "", acento }));
    const base = { deporte: o.deporte, torneo: o.evento, instancia: "", credito: "" };
    // marcador: "2-0 vs Nueva Zelanda (NZL)", "21-16, 21-12 vs X (DOM)"
    const lineaVs = lineas.find((l) => /\bvs\.?\b/i.test(l) && /\d+\s*-\s*\d+/.test(l)) || "";
    const pais = (lineaVs.match(/\(([A-Z]{3})\)/) || [])[1] || "";
    const marcadores = [...lineaVs.matchAll(/(\d{1,3})\s*-\s*(\d{1,3})/g)].map((m) => [m[1], m[2]]);
    const rival = (lineaVs.match(/\bvs\.?\s+([^(,0-9]+?)(?:\s*\(|\s+por\b|,|$)/i) || [])[1] || "";
    let pags;
    if (plantilla === "medalla") {
      const txt = medalla?.texto || lineas[0] || "";
      // "Cecilia Dieleke ganó la medalla..." -> nombre = lo que está antes del verbo
      const m = txt.match(/^(.+?)\s+(?:les?\s+)?(gan[oó]|logr[oó]|se (colg[oó]|qued[oó]|consagr[oó]|llev[oó])|conquist[oó]|obtuvo|consigui[oó]|fue|termin[oó]|sum[oó])(?=\s|$)/i);
      pags = [pag("medalla", { prueba: o.deporte, nombre: m ? m[1].replace(/\(.*?\)/g, "").trim() : "", medalla: medalla?.clave || "oro", evento: o.evento, credito: "" }), ...lasPlacas];
    } else if (plantilla === "historia") {
      const pls = placas.slice(0, 4).map((pl) => pag("s-texto", { ...base, titulo: pl.titulo || "Resultado", texto: pl.texto.join("\n").slice(0, 500) }));
      pags = [pag("s-portada", { ...base, linea1: "Argentina", linea2: "", credito: "" }), ...pls];
    } else if (plantilla === "sets") {
      pags = [pag("s-sets", { ...base, arg: "Argentina", rival, rival_pais: pais, sets: marcadores.map((s) => s.join("-")).join(", "), frase: "" })];
    } else if (plantilla === "partido") {
      const [gl, gv] = marcadores[0] || ["", ""];
      pags = [pag("s-partido", { ...base, gl, gv, rival_pais: pais, frase: "", goleadores: "" })];
    } else if (plantilla === "posicion") {
      const l = lineas.find((x) => /\d+\s*[°º]/.test(x)) || "";
      const nombre = (l.match(/^(.+?)\s+(fue|termin[oó]|qued[oó]|finaliz[oó]|lleg[oó])\b/i) || [])[1] || "";
      pags = [pag("s-posicion", { ...base, prueba: placas[0]?.titulo || "", nombre: nombre.replace(/\(.*?\)/g, "").trim(),
        posicion: (l.match(/(\d+)\s*[°º]/) || [])[1] ? (l.match(/(\d+)\s*[°º]/))[1] + "°" : "", marca: "" })];
    } else if (["convocados", "grupos", "fixture", "agenda", "clasificados"].includes(plantilla)) {
      const ej = PLANTILLAS[plantilla].paginas()[0];
      const vacio = Object.fromEntries(Object.keys(ej.datos).map((k) => [k, ""]));
      const extra = { convocados: { titulo: "Convocados", lista: lineas.filter((l) => l.length < 60).join("\n") }, grupos: { grupos: "" }, fixture: { partidos: "" },
        agenda: { titulo: "Agenda del día", items: "" }, clasificados: { titulo: "Clasificados a Los Ángeles 2028", lista: "" } }[plantilla];
      pags = [pag(plantilla, { ...vacio, deporte: o.deporte, torneo: o.evento, ...extra })];
    } else {
      pags = [pag("portada", { ...base, titulo: o.titulo }), ...lasPlacas];
    }
    if (pags.length === 1 && TIPOS[pags[0].tipo].formato === "feed") pags.push(pag("placa", { titulo: "Título", texto: "", credito: "", acento }));
    return { plantilla, sel: 0, paginas: pags, origen: o };
  }

  window.Graficas = { dibujar, desdeEvento };
})();
