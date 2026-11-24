// EDITOR DE GRÁFICAS – copia de las plantillas de Canva ("Nuevas graficas") para editarlas desde el panel.
// Cambiás textos y fotos, y descargás las imágenes listas para Instagram (1080 px de ancho).
// Todo pasa en el teléfono/compu: las fotos no se suben a ningún lado.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // DORADA / PLATEADA / BRONCE en mayúscula salen con el color de su medalla
  const colorMed = (h) => h.replace(/\b(DORAD[AO]S?|ORO)\b/g, '<span class="g-med-oro">$1</span>')
    .replace(/\b(PLATEAD[AO]S?|PLATA)\b/g, '<span class="g-med-plata">$1</span>').replace(/\b(BRONCES?)\b/g, '<span class="g-med-bronce">$1</span>');
  const br = (s) => colorMed(esc(s)).replace(/\n/g, "<br>");
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
      { k: "lista", label: "Lista (una persona por línea: número de camiseta, nombre y, con \" - \", club o puesto. El número es opcional)", ej: "10 Nombre Apellido - Club", area: true, filas: 10 },
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
    "s-convocados": { formato: "story", nombre: "Historia convocados", campos: ["deporte", "torneo",
      { k: "titulo", label: "Título", ej: "Convocadas" },
      { k: "lista", label: "Lista (una persona por línea: número, nombre y, con \" - \", club o puesto)", ej: "10 Nombre Apellido - Club", area: true, filas: 12 },
      { k: "dt", label: "Entrenador/a (opcional)", ej: "Fernando Ferrara" }, "credito"] },
    "s-grupos": { formato: "story", nombre: "Historia grupos", sinFoto: true, campos: ["deporte", "torneo", "instancia",
      { k: "grupos", label: "Grupos (uno por línea: \"Grupo A: Argentina, Brasil, Chile\")", ej: "Grupo A: Argentina, Brasil, Chile, Perú", area: true, filas: 8 }] },
    lateral: { formato: "feed", nombre: "Placa foto al costado", campos: ["titulo", "texto", "tam", "credito",
      { k: "acento", label: "Color del número", opciones: [["celeste", "Celeste"], ["naranja", "Naranja"], ["dorado", "Dorado"]] }] },
    sede: { formato: "feed", nombre: "Sede confirmada", campos: ["deporte",
      { k: "etiqueta", label: "Arriba del evento", ej: "¡Es oficial!" }, { k: "evento", label: "Evento", ej: "Mundial de Hockey 2030" },
      { k: "ciudad", label: "Sede (ciudad, país)", ej: "Buenos Aires, Argentina" }, { k: "fechas", label: "Fechas (opcional)", ej: "Del 4 al 18 de julio de 2030" },
      { k: "detalle", label: "Detalle (opcional)", ej: "Argentina vuelve a recibir un Mundial después de 20 años" }, "credito"] },
    "s-sede": { formato: "story", nombre: "Historia sede confirmada", campos: ["deporte",
      { k: "etiqueta", label: "Arriba del evento", ej: "¡Es oficial!" }, { k: "evento", label: "Evento", ej: "Mundial de Hockey 2030" },
      { k: "ciudad", label: "Sede (ciudad, país)", ej: "Buenos Aires, Argentina" }, { k: "fechas", label: "Fechas (opcional)", ej: "Del 4 al 18 de julio de 2030" },
      { k: "detalle", label: "Detalle (opcional)", ej: "Argentina vuelve a recibir un Mundial después de 20 años" }, "credito"] },
    clasificados: { formato: "feed", nombre: "Clasificados", logo: true, campos: [
      { k: "titulo", label: "Título", ej: "Clasificados a Los Ángeles 2028" },
      { k: "lista", label: "Clasificados (uno por línea: deporte | quién)", ej: "Hockey | Las Leonas", area: true, filas: 10 },
      { k: "total", label: "Número grande (vacío = cuenta la lista)", ej: "" }, { k: "etiqueta", label: "Debajo del número", ej: "plazas" },
      { k: "nuevo", label: "Último en sumarse (opcional)", ej: "Rugby 7 · Los Pumas 7s" }, "credito"] },
    clasificado: { formato: "feed", nombre: "Clasificado", logo: true, campos: ["deporte",
      { k: "titulo", label: "Título", ej: "¡Clasificada a Los Ángeles 2028!" }, { k: "nombre", label: "Quién", ej: "Nombre Apellido" },
      { k: "detalle", label: "Cómo clasificó (opcional)", ej: "Ganó el oro en los Juegos Panamericanos" },
      { k: "plaza", label: "Número de plaza (opcional)", ej: "12" }, "credito"] },
  };

  // ---------- plantillas (como vienen de Canva) ----------
  const PLANTILLAS = {
    carrusel: { nombre: "Carrusel feed", paginas: () => [
      pag("portada", { deporte: "Básquet 3x3", torneo: "Americup - El Salvador", titulo: "Argentina entre los ocho mejores del continente", credito: "CAB" }),
      pag("placa", { titulo: "Femenino y masculino", texto: "En ambas ramas, los seleccionados argentinos se despidieron de la Americup en cuartos de final.", credito: "CAB" }),
      pag("placa", { titulo: "La final", texto: "El argentino largó tercero y en los últimos 500 metros pasó a sus rivales para quedarse con el oro.", credito: "Nombre Apellido / Agencia", fondo: "claro" }),
    ] },
    lateral: { nombre: "Carrusel foto al costado", paginas: () => [
      pag("portada", { deporte: "Remo", torneo: "Mundial de Remo 2026", titulo: "Argentina, a la final", credito: "AAR" }),
      pag("lateral", { titulo: "La regata", texto: "El doble par ligero terminó segundo en su semifinal y se metió entre los seis mejores del mundo.", credito: "AAR" }),
      pag("lateral", { titulo: "Lo que viene", texto: "La final se corre el domingo a las 9:30 (hora argentina).", credito: "AAR", acento: "dorado" }),
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
        lista: "1 Cristina Cosentino - Arquera\n4 Agustina Gorzelany\n7 Valentina Raposo\n9 Victoria Sauze\n11 Agustina Albertarrio\n12 María José Granatto\n14 Julieta Jankunas\n15 Rocío Sánchez Moccia\n17 Sofía Toccalino\n20 Eugenia Trinchinetti", credito: "CAH" })] },
    grupos: { nombre: "Grupos", paginas: () => [
      pag("grupos", { deporte: "Básquet", torneo: "AmeriCup 2026", instancia: "Así quedaron los grupos",
        grupos: "Grupo A: Argentina, Brasil, Uruguay, Panamá\nGrupo B: Estados Unidos, Canadá, México, Colombia\nGrupo C: Puerto Rico, Venezuela, Dominicana, Chile" })] },
    "s-convocados": { nombre: "Historia convocados", paginas: () => [
      pag("s-convocados", { deporte: "Hockey", torneo: "Pro League 2026", titulo: "Convocadas", dt: "Fernando Ferrara",
        lista: "1 Cristina Cosentino - Arquera\n4 Agustina Gorzelany\n7 Valentina Raposo\n9 Victoria Sauze\n11 Agustina Albertarrio\n12 María José Granatto\n14 Julieta Jankunas\n15 Rocío Sánchez Moccia", credito: "CAH" })] },
    "s-grupos": { nombre: "Historia grupos", paginas: () => [
      pag("s-grupos", { deporte: "Básquet", torneo: "AmeriCup 2026", instancia: "Así quedaron los grupos",
        grupos: "Grupo A: Argentina, Brasil, Uruguay, Panamá\nGrupo B: Estados Unidos, Canadá, México, Colombia\nGrupo C: Puerto Rico, Venezuela, Dominicana, Chile" })] },
    sede: { nombre: "Sede confirmada", paginas: () => [
      pag("sede", { deporte: "Hockey", etiqueta: "¡Es oficial!", evento: "Mundial de Hockey 2030", ciudad: "Buenos Aires, Argentina", fechas: "Del 4 al 18 de julio de 2030", detalle: "", credito: "CAH" })] },
    "s-sede": { nombre: "Historia sede confirmada", paginas: () => [
      pag("s-sede", { deporte: "Hockey", etiqueta: "¡Es oficial!", evento: "Mundial de Hockey 2030", ciudad: "Buenos Aires, Argentina", fechas: "Del 4 al 18 de julio de 2030", detalle: "", credito: "CAH" })] },
    fixture: { nombre: "Fixture", paginas: () => [
      pag("fixture", { deporte: "Básquet", torneo: "AmeriCup 2026",
        partidos: "Sáb 15/11 | 15:00 | Brasil (BRA) | Fase de grupos\nLun 17/11 | 18:30 | Uruguay (URU) | Fase de grupos\nMié 19/11 | 21:00 | Panamá (PAN) | Fase de grupos", nota: "Horarios de Argentina" })] },
    agenda: { nombre: "Agenda del día", paginas: () => [
      pag("agenda", { titulo: "Agenda del día", fecha: "Sábado 15/11", torneo: "Dakar 2026",
        items: "08:30 | Natación | Agostina Hein - 400 m libre (series)\n10:00 | Judo | Nombre Apellido - -57 kg\n13:00 | Hockey 5 | Las Leoncitas vs India\n17:30 | Atletismo | Nombre Apellido - salto en largo (final)", nota: "Horarios de Argentina" })] },
    clasificado: { nombre: "Clasificado LA 2028", paginas: () => [
      pag("clasificado", { deporte: "Remo", titulo: "¡Clasificado a Los Ángeles 2028!", nombre: "Nombre Apellido", detalle: "Ganó el oro en el Preolímpico de Río", plaza: "12", credito: "COA" })] },
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
    try { localStorage.setItem("ad-grafica", JSON.stringify({ ...G, paginas: G.paginas.map((p) => ({ ...p, foto: { ...p.foto, src: "", video: "" } })) })); } catch {}
  }
  const formato = () => TIPOS[G.paginas[0].tipo].formato;

  // ---------- dibujo de cada página (tamaño real: 1080 de ancho) ----------
  function foto(p, clase = "") {
    const f = p.foto;
    const img = f.src ? `<img src="${f.src}" style="object-position:${f.x}% ${f.y}%;transform:scale(${f.z});transform-origin:${f.x}% ${f.y}%">`
      : `<div class="g-sinfoto">Foto (tocá "Subir foto")</div>`;
    return `<div class="g-foto ${clase}">${img}${f.video ? `<span class="g-es-video">🎬 Video</span>` : ""}</div>`;
  }
  const credito = (d, clase = "") => d.credito ? `<div class="g-credito ${clase}">Foto: ${esc(d.credito)}</div>` : "";
  // logo de Argentina Dorada (círculo): panel/img/logo-ad.png
  const LOGO_AD = "img/logo-ad.png";
  const marcaAD = (clase = "") => `<img class="g-ad-logo ${clase}" src="${LOGO_AD}" alt="Argentina Dorada">`;
  const logoAD = () => `<img class="g-logo-ad" src="${LOGO_AD}" alt="Argentina Dorada">`;
  const num = (i) => String(i + 1).padStart(2, "0");
  const MEDALLAS = { oro: ["¡Medalla dorada!", "oro"], plata: ["¡Medalla plateada!", "plata"], bronce: ["¡Medalla de bronce!", "bronce"] };

  const DIBUJO = {
    portada: (p) => { const d = p.datos; return `${foto(p, "g-full")}<div class="g-degrade"></div>
      <div class="g-pt-arriba">${d.deporte ? `<span class="g-pill oro">${esc(d.deporte)}</span>` : ""}<div class="g-pt-torneo" data-lineas="2">${esc(d.torneo)}</div></div>
      ${logoAD()}
      <div class="g-pt-titulo" data-fit><div class="g-linea"></div><h1 data-fs="titulo" data-ancho>${br(d.titulo)}</h1></div>
      ${credito(d, "caja")}<div class="g-desliza">Deslizá <span>⟶</span></div>`; },
    placa: (p, i) => { const d = p.datos; return `<div class="g-placa ${d.fondo === "claro" ? "claro" : ""}">
      ${foto(p, "g-pl-foto")}${credito(d, "g-pl-cred")}
      <div class="g-pl-cuerpo" data-fit><div class="g-linea"></div><h2 data-fs="titulo" data-ancho>${br(d.titulo)}</h2><p data-fs="texto">${br(d.texto)}</p></div>
      ${marcaAD("g-pl-ad")}<div class="g-pl-num ${d.acento || "celeste"}">${num(i)}</div></div>`; },
    medalla: (p) => { const d = p.datos; const [txt, cls] = MEDALLAS[d.medalla] || MEDALLAS.oro; return `${foto(p, "g-full")}<div class="g-degrade suave"></div>
      <div class="g-md-prueba">${esc(d.prueba)}</div><div class="g-md-nombre">${esc(d.nombre)}</div>
      ${logoAD()}
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
      const ganados = [0, 1].map((k) => sets.filter((s) => +s[k] > +s[1 - k]).length);
      const gano = ganados[0] === ganados[1] ? -1 : ganados[0] > ganados[1] ? 0 : 1; // en dorado el que ganó el partido
      return `${marcaAD("g-s-head")}<div class="g-ss-cab"><div class="g-ss-torneo" data-lineas="2">${esc(d.torneo)}</div>
      ${d.deporte ? `<span class="g-pill celeste g-ss-pill">${esc(d.deporte)}</span>` : ""}</div>${credito(d, "g-ss-cred")}${foto(p, "g-ss-foto")}
      <div class="g-ss-abajo" data-fit><table class="g-sets n${Math.min(sets.length, 5)}"><tr><th></th>${cols}</tr>
        <tr class="${gano === 0 ? "gana" : ""}"><td><span data-ancho>${esc(d.arg).replace(/([\/-])/g, "$1<wbr>")}</span><small>(ARG)</small></td>${sets.map((s) => `<td class="${+s[0] > +s[1] ? "gana" : ""}">${esc(s[0])}</td>`).join("")}</tr>
        <tr class="${gano === 1 ? "gana" : ""}"><td><span data-ancho>${esc(d.rival).replace(/([\/-])/g, "$1<wbr>")}</span><small>(${esc(d.rival_pais)})</small></td>${sets.map((s) => `<td class="${+s[1] > +s[0] ? "gana" : ""}">${esc(s[1])}</td>`).join("")}</tr></table>
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
      ${logoAD()}
      <div class="g-cv-cuerpo" data-fit><h1 data-fs="titulo" data-ancho>${esc(d.titulo)}</h1><div class="g-linea"></div>
        <ol class="g-cv-lista ${gente.length > 9 ? "dos" : ""}" data-fs="texto">${gente.map((g) => {
          // "10 Nombre - Club", "#10 Nombre", "10. Nombre" → número de camiseta aparte
          const m = g.match(/^#?(\d{1,3})[.)\-–]?\s+(.+)$/); const resto = m ? m[2] : g; const [n, x] = resto.split(/\s+-\s+/);
          return `<li><i>${m ? esc(m[1]) : ""}</i><b>${esc(n)}</b>${x ? `<span>${esc(x)}</span>` : ""}</li>`; }).join("")}</ol>
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
      return `${foto(p, "g-full")}<div class="g-cl-velo"></div>${logoEvento()}${logoAD()}
      <div class="g-cv-cuerpo g-cl-cuerpo" data-fit><div class="g-cl-top"><div class="g-cl-numero"><b>${esc(total)}</b><span>${esc(d.etiqueta || "")}</span></div>
        <h1 data-fs="titulo" data-ancho>${esc(d.titulo)}</h1></div><div class="g-linea"></div>
        ${d.nuevo ? `<p class="g-cl-nuevo" data-fs="texto"><span>Se sumó</span> ${esc(d.nuevo)}</p>` : ""}
        <ul class="g-cl-lista ${cl.length > 8 ? "dos" : ""}" data-fs="texto">${cl.map(([a, b]) => `<li>${b !== undefined ? `<span>${esc(a)}</span><b>${esc(b)}</b>` : `<b>${esc(a)}</b>`}</li>`).join("")}</ul></div>
      ${credito(d, "g-cv-cred")}`; },
  };
  DIBUJO.clasificado = (p) => { const d = p.datos;
    return `${foto(p, "g-c1-foto")}<div class="g-c1-degrade"></div>${logoEvento()}${logoAD()}
      <div class="g-c1-abajo" data-fit>${d.deporte ? `<span class="g-pill oro">${esc(d.deporte)}</span>` : ""}
        <h1 data-fs="titulo" data-ancho>${esc(d.titulo)}</h1><div class="g-linea"></div>
        <h2 class="g-c1-nombre" data-ancho>${esc(d.nombre)}</h2>
        ${d.detalle ? `<p class="g-c1-detalle" data-fs="texto">${esc(d.detalle)}</p>` : ""}
        ${d.plaza ? `<div class="g-c1-plaza"><b>${esc(d.plaza)}</b><span>${/^\d+$/.test(String(d.plaza).trim()) ? "plaza para Argentina" : ""}</span></div>` : ""}</div>
      ${credito(d, "g-cv-cred")}`; };
  DIBUJO["s-convocados"] = (p) => DIBUJO.convocados(p).replace(logoAD(), marcaAD("g-s-head"));
  DIBUJO["s-grupos"] = DIBUJO.grupos;
  // placa con la foto vertical a la izquierda y el texto a la derecha
  DIBUJO.lateral = (p, i) => { const d = p.datos; return `<div class="g-placa g-lat">${foto(p, "g-lat-foto")}${credito(d, "g-lat-cred")}
      <div class="g-lat-cuerpo" data-fit><div class="g-linea"></div><h2 data-fs="titulo" data-ancho>${br(d.titulo)}</h2><p data-fs="texto">${br(d.texto)}</p></div>
      ${marcaAD("g-lat-ad")}<div class="g-pl-num ${d.acento || "celeste"}">${num(i)}</div></div>`; };
  // sede confirmada: foto de la ciudad/estadio, "¡Es oficial!", evento y la sede con un pin
  const sedeHTML = (d, story) => `<div class="${story ? "g-sd-abajo story" : "g-sd-abajo"}" data-fit>
      ${d.deporte ? `<span class="g-pill oro">${esc(d.deporte)}</span>` : ""}${d.etiqueta ? `<div class="g-sd-etiqueta">${esc(d.etiqueta)}</div>` : ""}
      <h1 data-fs="titulo" data-ancho>${br(d.evento)}</h1><div class="g-linea"></div>
      <div class="g-sd-ciudad"><span class="pin"></span><b data-ancho>${esc(d.ciudad)}</b></div>
      ${d.fechas ? `<div class="g-sd-fechas">${esc(d.fechas)}</div>` : ""}${d.detalle ? `<p data-fs="texto">${esc(d.detalle)}</p>` : ""}</div>`;
  DIBUJO.sede = (p) => `${foto(p, "g-full")}<div class="g-degrade"></div>${logoAD()}${sedeHTML(p.datos)}${credito(p.datos, "caja")}`;
  DIBUJO["s-sede"] = (p) => `${foto(p, "g-full")}<div class="g-degrade story"></div>${marcaAD("g-s-head")}${sedeHTML(p.datos, true)}<div class="g-marco"></div>${credito(p.datos, "g-s-cred-abajo")}`;
  // logo del evento (ej. LA28): lo sube cada uno, queda guardado en ese dispositivo y no se sube a ningún lado
  let LOGO = ""; try { LOGO = localStorage.getItem("ad-logo-evento") || ""; } catch {}
  const logoEvento = () => LOGO ? `<img class="g-logo-evento" src="${LOGO}" alt="">` : `<div class="g-logo-evento g-sinfoto">Logo (opcional)</div>`;
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
      const sobra = () => caja.scrollHeight > caja.clientHeight + 8; // margen chico: las letras grandes sobresalen unos px de su caja
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
      <div class="g-plantillas-grupos">${[["feed", "Feed"], ["story", "Historias"]].map(([f, titulo]) => `<div class="g-grupo"><span>${titulo}</span>
        <div class="g-plantillas" role="tablist">${Object.entries(PLANTILLAS).filter(([, pl]) => TIPOS[pl.paginas()[0].tipo].formato === f).map(([id, pl]) =>
        `<button data-p="${id}" class="${id === G.plantilla ? "activo" : ""}">${esc(pl.nombre)}</button>`).join("")}</div></div>`).join("")}</div>
      <div class="g-tira">${G.paginas.map((p, i) => `<button class="g-mini ${i === G.sel ? "activo" : ""}" data-i="${i}">${escalada(p, i, 92)}<span>${num(i)}</span></button>`).join("")}
        <div class="g-agregar"><select aria-label="Agregar página">${otros.map(([k, t]) => `<option value="${k}">${esc(t.nombre)}</option>`).join("")}</select><button class="g-mas">+ Página</button></div></div>
      <div class="g-trabajo"><div class="g-vista"></div><div class="g-campos"></div></div>
      <div class="g-acciones">${navigator.canShare ? `<button class="g-compartir principal">📲 Publicar (Instagram, X, WhatsApp…)</button>` : ""}
        <button class="g-bajar ${navigator.canShare ? "" : "principal"}">⬇ Descargar ${G.paginas.length > 1 ? `las ${G.paginas.length} imágenes` : "imagen"}</button>
        <span class="g-video-grupo"><button class="g-video">🎬 Video animado (página ${num(G.sel)})</button>
        <select class="g-entrada" aria-label="Cómo entran los textos">${[["mezcla", "Títulos del costado, resto de abajo"], ["abajo", "Todo desde abajo"], ["costado", "Todo desde el costado"]]
          .map(([v, t]) => `<option value="${v}" ${v === ENTRADA ? "selected" : ""}>${t}</option>`).join("")}</select></span>
        ${G.origen?.textoIG ? `<button class="g-copiar-ig">📋 Copiar texto para IG</button>` : ""}
        <button class="g-reset">Volver a la plantilla</button></div>
      ${G.origen?.textoIG ? `<details class="g-texto-ig"><summary>Ver / editar el texto del posteo</summary><textarea rows="10">${esc(G.origen.textoIG)}</textarea></details>` : ""}
      <p class="ayuda">🎬 Video animado: al terminar de grabar aparece abajo para verlo, descargarlo o publicarlo ("Descargar imágenes" baja solo las fotos). Los textos entran de a uno sobre la foto (o sobre el video, si subiste uno). Dura 6 segundos con foto o lo que dure el video (hasta 20 s). Se arma en el momento: no cierres la pantalla mientras graba.</p>
      ${navigator.canShare ? `<p class="ayuda">📲 Publicar abre la lista de apps del celu: elegí Instagram → Publicación y ya va con las ${G.paginas.length} imágenes en orden, sin guardarlas.
        Si Instagram las muestra cuadradas, tocá el ícono de las flechitas (abajo a la izquierda de la foto) para que queden 4:5.</p>` : ""}
      <p class="ayuda">Las fotos quedan solo en este dispositivo. Los textos se guardan como borrador acá mismo.</p>`;
    raiz.querySelectorAll(".g-plantillas button").forEach((b) => (b.onclick = () => {
      // fotos ya subidas: se conservan en el mismo orden
      const fotos = G.paginas.map((p) => p.foto);
      G = G.origen ? armarDesde(G.origen, b.dataset.p) : nuevo(b.dataset.p);
      G.paginas.forEach((p, i) => { if (fotos[i]?.src) p.foto = fotos[i]; });
      guardar(); armar();
    }));
    raiz.querySelector(".g-soltar")?.addEventListener("click", () => { G = nuevo(G.plantilla); guardar(); armar(); });
    raiz.querySelectorAll(".g-mini").forEach((b) => (b.onclick = () => { G.sel = Number(b.dataset.i); armar(); }));
    raiz.querySelector(".g-mas").onclick = () => {
      const tipo = raiz.querySelector(".g-agregar select").value;
      const base = G.paginas.at(-1);
      const nueva = pag(tipo, { credito: base.datos.credito, deporte: base.datos.deporte, torneo: base.datos.torneo, instancia: base.datos.instancia,
        acento: base.datos.acento, fondo: base.datos.fondo, titulo: "Título", texto: "Texto" });
      G.paginas.push(nueva); G.sel = G.paginas.length - 1; guardar(); armar();
    };
    raiz.querySelector(".g-bajar").onclick = () => descargar(false);
    raiz.querySelector(".g-compartir")?.addEventListener("click", () => descargar(true));
    raiz.querySelector(".g-video").onclick = () => grabarVideo(G.paginas[G.sel], G.sel);
    raiz.querySelector(".g-entrada").onchange = (ev) => { ENTRADA = ev.target.value; try { localStorage.setItem("ad-entrada", ENTRADA); } catch {} };
    // el texto del posteo: se copia desde acá mismo (si lo editaron abajo, va el editado)
    const areaIG = raiz.querySelector(".g-texto-ig textarea");
    areaIG?.addEventListener("input", () => { G.origen.textoIG = areaIG.value; guardar(); });
    raiz.querySelector(".g-copiar-ig")?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(G.origen.textoIG); alertar("Texto copiado para Instagram"); } catch { alertar("No se pudo copiar"); }
    });
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
      ${t.sinFoto ? "" : `<div class="g-foto-ctrl"><label class="g-subir">📷 ${p.foto.src ? "Cambiar foto o video" : "Subir foto o video"}<input type="file" accept="image/*,video/*" hidden></label>
        ${p.foto.src ? `<label>Zoom<input type="range" data-f="z" min="1" max="3" step="0.05" value="${p.foto.z}"></label>
        <label>↔<input type="range" data-f="x" min="0" max="100" value="${p.foto.x}"></label>
        <label>↕<input type="range" data-f="y" min="0" max="100" value="${p.foto.y}"></label>` : ""}</div>`}
      ${t.logo ? `<div class="g-foto-ctrl"><label class="g-subir">🏅 ${LOGO ? "Cambiar logo" : "Subir logo (ej. LA28)"}<input type="file" accept="image/*" data-logo hidden></label>
        ${LOGO ? `<button class="g-sin-logo">Quitar logo</button>` : ""}<small>Queda guardado en este celu/compu.</small></div>` : ""}
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
    const subirLogo = caja.querySelector("input[data-logo]");
    if (subirLogo) subirLogo.onchange = (ev) => {
      const archivo = ev.target.files[0]; if (!archivo) return;
      const img = new Image();
      img.onload = () => { // PNG para respetar la transparencia, hasta 600 px
        const s = Math.min(1, 600 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        LOGO = c.toDataURL("image/png"); try { localStorage.setItem("ad-logo-evento", LOGO); } catch {}
        URL.revokeObjectURL(img.src); armar();
      };
      img.src = URL.createObjectURL(archivo);
    };
    caja.querySelector(".g-sin-logo")?.addEventListener("click", () => { LOGO = ""; try { localStorage.removeItem("ad-logo-evento"); } catch {} armar(); });
    const subir = caja.querySelector("input[type=file]:not([data-logo])");
    if (subir) subir.onchange = (ev) => {
      const archivo = ev.target.files[0]; if (!archivo) return;
      if (archivo.type.startsWith("video/")) {
        // video: se guarda solo en memoria (no se sube a ningún lado); para la vista se usa un cuadro del principio
        const url = URL.createObjectURL(archivo);
        cuadroDeVideo(url).then((src) => { p.foto = { src, video: url, z: 1, x: 50, y: 50 }; vista(); campos(); armar(); })
          .catch(() => alertar("No se pudo abrir ese video"));
        return;
      }
      achicar(archivo).then((src) => { p.foto = { src, z: 1, x: 50, y: 50 }; vista(); campos(); armar(); });
    };
    const mover = (d) => { const [x] = G.paginas.splice(G.sel, 1); G.sel += d; G.paginas.splice(G.sel, 0, x); guardar(); armar(); };
    caja.querySelector(".g-izq")?.addEventListener("click", () => mover(-1));
    caja.querySelector(".g-der")?.addEventListener("click", () => mover(1));
    caja.querySelector(".g-quitar")?.addEventListener("click", () => { G.paginas.splice(G.sel, 1); G.sel = Math.max(0, G.sel - 1); guardar(); armar(); });
  }

  function cuadroDeVideo(url) {
    return new Promise((ok, mal) => {
      const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
      v.onloadeddata = () => { v.currentTime = Math.min(0.3, (v.duration || 1) / 2); };
      v.onseeked = () => {
        const s = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
        const c = document.createElement("canvas"); c.width = v.videoWidth * s; c.height = v.videoHeight * s;
        c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", 0.85));
      };
      v.onerror = mal;
    });
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

  async function descargar(compartir) {
    const b = raiz.querySelector(compartir ? ".g-compartir" : ".g-bajar"); const txt = b.textContent;
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
      // "Publicar": se abre la lista de apps (Instagram, X, WhatsApp...) con las imágenes en orden, sin guardarlas
      if (compartir) {
        if (navigator.canShare?.({ files: archivos })) await navigator.share({ files: archivos }).catch(() => {});
        else alertar("Este navegador no deja compartir imágenes: usá Descargar");
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
  // ---------- video animado ----------
  // Capas: 1) fondo (color + foto o video), 2) la gráfica sin textos, 3) cada texto, que entra de a uno (aparece y sube un poco).
  // Se dibuja todo en un canvas y se graba con MediaRecorder (MP4 si el navegador puede; si no, WebM).
  const ANIMA = "h1, h2, p, ol, ul, table, .g-pill, .g-linea, .g-marcador, .g-spo-cajas, .g-spo-nombre, .g-gr-grilla, .g-fx-lista, .g-ag-lista, .g-c1-plaza, "
    + ".g-cl-numero, .g-caja-torneo, .g-st-caja, .g-sm-caja, .g-md-titulo, .g-md-nombre, .g-md-prueba, .g-md-evento, .g-pt-torneo, .g-sd-etiqueta, .g-sd-ciudad, "
    + ".g-sd-fechas, .g-frase, .g-desliza, .g-pl-num, .g-gr-torneo, .g-gr-inst, .g-fx-titulo, .g-ag-titulo, .g-sm-gol, .g-cv-dt";
  let ENTRADA = "mezcla"; try { ENTRADA = localStorage.getItem("ad-entrada") || "mezcla"; } catch {}
  function tipoVideo() {
    for (const t of ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"]) if (window.MediaRecorder?.isTypeSupported?.(t)) return t;
    return "";
  }
  async function grabarVideo(p, i) {
    const tipo = tipoVideo();
    if (!tipo || !HTMLCanvasElement.prototype.captureStream) return alertar("Este navegador no puede grabar video. Probá con Chrome o con el celu.");
    const b = raiz.querySelector(".g-video"); const txt = b.textContent; b.disabled = true; b.textContent = "Preparando…";
    const taller = document.createElement("div"); taller.className = "g-taller"; document.body.append(taller);
    let video = null, audio = null;
    try {
      await cargarLibreria(); await document.fonts.ready;
      const fontEmbedCSS = await cssFuentes();
      const [w, h] = TAM[TIPOS[p.tipo].formato];
      taller.innerHTML = paginaHTML(p, i);
      const nodo = taller.firstElementChild; ajustar(nodo, p);
      await Promise.all([...nodo.querySelectorAll("img")].map((im) => im.decode().catch(() => {})));
      const caja0 = nodo.getBoundingClientRect();
      // los textos a animar (solo los de más afuera), de arriba hacia abajo
      // las listas (fixture, convocados, agenda, grupos, sets...) entran renglón por renglón
      const LISTAS = "ol, ul, table, .g-fx-lista, .g-ag-lista, .g-gr-grilla";
      const todos = [...nodo.querySelectorAll(ANIMA)].filter((el) => el.offsetWidth && !el.parentElement.closest(ANIMA))
        .flatMap((el) => { if (!el.matches(LISTAS)) return [el];
          const hijos = [...(el.tagName === "TABLE" ? el.querySelectorAll("tr") : el.children)].filter((x) => x.offsetWidth);
          hijos.forEach((x) => (x.dataset.renglon = "1")); return hijos.length ? hijos : [el]; });
      const pos = (el) => el.getBoundingClientRect();
      todos.sort((a, c) => pos(a).top - pos(c).top || pos(a).left - pos(c).left);
      const foto = nodo.querySelector(".g-foto");
      const conVideo = !!(p.foto.video && foto);
      // la foto (o el video) va en su propia capa: así solo ella hace el zoom lento y el logo, el torneo, etc. quedan quietos
      const aparte = !!(foto && (conVideo || (p.foto.src && foto.querySelector("img"))));
      const opts = { width: w, height: h, pixelRatio: 1, fontEmbedCSS };
      // capa base: sin textos (y, si hay video, con un agujero donde va el video)
      todos.forEach((el) => (el.style.visibility = "hidden"));
      let colorFondo = getComputedStyle(nodo).backgroundColor, rectFoto = null;
      const fondosSacados = [];
      if (aparte) {
        const r = foto.getBoundingClientRect();
        rectFoto = { x: r.left - caja0.left, y: r.top - caja0.top, w: r.width, h: r.height };
        let hallado = false;
        for (let el = foto; el; el = el.parentElement) {
          const bg = getComputedStyle(el).backgroundColor;
          if (el !== foto && !hallado && bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { colorFondo = bg; hallado = true; }
          fondosSacados.push([el, el.style.background]); el.style.background = "transparent";
          if (el === nodo) break;
        }
        foto.querySelector("img").style.visibility = "hidden";
      }
      const base = await htmlToImage.toCanvas(nodo, opts);
      fondosSacados.forEach(([el, bg]) => (el.style.background = bg));
      if (aparte) foto.querySelector("img").style.visibility = "";
      let fotoQuieta = null;
      if (aparte && !conVideo) { fotoQuieta = new Image(); fotoQuieta.src = p.foto.src; await fotoQuieta.decode().catch(() => {}); }
      // una capa por texto
      const capas = [];
      nodo.style.background = "transparent";
      for (const [k, el] of todos.entries()) {
        b.textContent = `Preparando… ${k + 1}/${todos.length}`;
        nodo.querySelectorAll("*").forEach((x) => (x.style.visibility = "hidden"));
        el.style.visibility = "visible"; el.querySelectorAll("*").forEach((x) => (x.style.visibility = "visible"));
        const fondos = []; // los contenedores no tienen que tapar
        for (let x = el.parentElement; x && x !== nodo.parentElement; x = x.parentElement) { fondos.push([x, x.style.background]); x.style.background = "transparent"; }
        // por dónde entra: los títulos grandes desde el costado, lo demás desde abajo (o todo igual, según el selector)
        const esTitulo = /^H[12]$/.test(el.tagName) || el.matches(".g-md-titulo, .g-md-nombre, .g-sd-etiqueta, .g-cl-numero, .g-marcador, .g-spo-nombre");
        const desde = ENTRADA === "abajo" ? "abajo" : ENTRADA === "costado" ? "costado" : esTitulo ? "costado" : "abajo";
        capas.push({ c: await htmlToImage.toCanvas(nodo, opts), desde: el.dataset.renglon ? "abajo" : desde, renglon: !!el.dataset.renglon });
        fondos.forEach(([x, bg]) => (x.style.background = bg));
      }
      // fondo en movimiento
      if (conVideo) {
        video = document.createElement("video"); video.src = p.foto.video; video.playsInline = true; video.preload = "auto";
        await new Promise((ok, mal) => { video.onloadeddata = ok; video.onerror = mal; });
      }
      const ultimo = capas.reduce((m, c, k) => m + (k ? (c.renglon && capas[k - 1].renglon ? 0.25 : 0.45) : 0.3), 0);
      const dur = conVideo ? Math.min(20, video.duration || 6) : Math.min(15, Math.max(6, ultimo + 1.6 + 2.5)); // que se llegue a leer quieto
      const lienzo = document.createElement("canvas"); lienzo.width = w; lienzo.height = h;
      const ctx = lienzo.getContext("2d");
      const stream = lienzo.captureStream(30);
      if (conVideo) { // el sonido del video también va
        try { audio = new AudioContext(); const dest = audio.createMediaStreamDestination(); audio.createMediaElementSource(video).connect(dest);
          dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t)); } catch {}
      }
      const rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 8e6 });
      const partes = []; rec.ondataavailable = (ev) => ev.data.size && partes.push(ev.data);
      const listo = new Promise((ok) => (rec.onstop = ok));
      const cubrir = (src, sw, sh, r, z, x, y) => { // como object-fit: cover + zoom y encuadre del editor
        const s0 = Math.max(r.w / sw, r.h / sh); let dw = sw * s0, dh = sh * s0;
        let dx = (r.w - dw) * x / 100, dy = (r.h - dh) * y / 100; const ox = r.w * x / 100, oy = r.h * y / 100;
        dx = ox + (dx - ox) * z; dy = oy + (dy - oy) * z; dw *= z; dh *= z;
        ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); ctx.drawImage(src, r.x + dx, r.y + dy, dw, dh); ctx.restore();
      };
      // entra suave y frena despacito al llegar (sin tirón al arrancar)
      const suave = (t) => { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
      const suaveL = (t) => Math.min(1, Math.max(0, t));
      // cuándo entra cada texto: de a uno, 0,45 s de diferencia, y cada uno tarda 1,6 s en llegar a su lugar
      // (los renglones de una lista salen más seguidos: 0,25 s)
      const INICIO = 0.3, ENTRE = 0.45, ENTRE_RENGLON = 0.25, TARDA = 1.6;
      let cuando = INICIO;
      capas.forEach((capa, k) => { if (k) cuando += capa.renglon && capas[k - 1].renglon ? ENTRE_RENGLON : ENTRE; capa.t0 = cuando; });
      const cuadro = (t) => {
        ctx.globalAlpha = 1;
        if (aparte) {
          ctx.fillStyle = colorFondo; ctx.fillRect(0, 0, w, h);
          if (conVideo) cubrir(video, video.videoWidth, video.videoHeight, rectFoto, p.foto.z, p.foto.x, p.foto.y);
          else cubrir(fotoQuieta, fotoQuieta.naturalWidth, fotoQuieta.naturalHeight, rectFoto, p.foto.z * (1 + 0.06 * suaveL(t / dur)), p.foto.x, p.foto.y); // zoom lento solo de la foto
          ctx.drawImage(base, 0, 0);
        } else ctx.drawImage(base, 0, 0); // sin foto: el fondo queda quieto
        capas.forEach((capa) => { const a = suave((t - capa.t0) / (capa.renglon ? TARDA * 0.8 : TARDA)); if (a <= 0) return;
          const falta = 1 - a; // 1 al arrancar, 0 cuando ya está en su lugar
          ctx.globalAlpha = Math.min(1, a * 1.4);
          if (capa.desde === "costado") ctx.drawImage(capa.c, -w * 0.3 * falta, 0);
          else ctx.drawImage(capa.c, 0, h * 0.08 * falta); });
      };
      cuadro(0); rec.start(250);
      if (conVideo) { video.currentTime = 0; await audio?.resume().catch(() => {});
        await video.play().catch(() => { video.muted = true; return video.play(); }); } // si el navegador no deja con sonido, va sin sonido
      const t0 = performance.now();
      await new Promise((ok) => {
        const paso = () => {
          const t = conVideo ? video.currentTime : (performance.now() - t0) / 1000;
          cuadro(t); b.textContent = `Grabando… ${Math.ceil(dur - t)} s`;
          if (t >= dur || (conVideo && video.ended)) return ok();
          requestAnimationFrame(paso);
        };
        paso();
      });
      video?.pause(); rec.stop(); await listo;
      const ext = tipo.includes("mp4") ? "mp4" : "webm";
      const archivo = new File(partes, `argentina-dorada-${G.plantilla}-${num(i)}.${ext}`, { type: tipo.split(";")[0] });
      mostrarVideo(archivo, ext);
    } catch (e) {
      console.error(e); alertar("No se pudo armar el video. Probá de nuevo.");
    } finally { audio?.close(); taller.remove(); b.disabled = false; b.textContent = txt; }
  }
  // el video terminado se muestra en pantalla con sus botones (compartir/descargar necesitan un toque nuevo: el navegador no deja hacerlo solo)
  let ultimoVideo = null;
  function mostrarVideo(archivo, ext) {
    if (ultimoVideo) URL.revokeObjectURL(ultimoVideo);
    const url = ultimoVideo = URL.createObjectURL(archivo);
    raiz.querySelector(".g-video-listo")?.remove();
    const caja = document.createElement("div"); caja.className = "g-video-listo";
    const puede = navigator.canShare?.({ files: [archivo] });
    caja.innerHTML = `<h3>🎬 Video listo</h3><video src="${url}" controls playsinline loop autoplay muted></video>
      <div class="g-acciones">${puede ? `<button class="principal v-compartir">📲 Publicar / compartir</button>` : ""}
        <a class="boton ${puede ? "" : "principal"} v-bajar" href="${url}" download="${archivo.name}">⬇ Descargar video</a>
        <button class="v-cerrar">Cerrar</button></div>
      ${ext === "webm" ? `<p class="ayuda">Salió en WebM: si Instagram no lo toma, armalo desde el celu (ahí sale en MP4).</p>` : ""}`;
    caja.querySelector(".v-compartir")?.addEventListener("click", () => navigator.share({ files: [archivo] }).catch(() => {}));
    caja.querySelector(".v-cerrar").onclick = () => caja.remove();
    raiz.querySelector(".g-acciones").after(caja);
    caja.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function alertar(t) { const a = $("#aviso"); if (!a) return; a.textContent = t; a.hidden = false; setTimeout(() => (a.hidden = true), 2500); }

  // ---------- desde un resultado: arma el carrusel con los datos del evento ----------
  function sinTildesG(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function limpio(partes) {
    return partes.filter((x) => !x.href).map((x) => x.t).join("").replace(/https?:\/\/\S+/g, "").replace(/\(\s*\)/g, "").replace(/\s+/g, " ").trim();
  }
  // opciones.medalla(partes) -> {clave: "oro"|"plata"|"bronce"} si la línea tiene una medalla en negrita
  function desdeEvento(e, opciones = {}) {
    // se guarda de dónde salió, así se puede pasar a otra plantilla (carrusel, medalla, historias) con los mismos datos
    const origen = { deporte: e.deporte || "", evento: e.evento || e.titulo || "", bloques: (e.bloques || []).filter((b) => b.partes || b.tipo === "espacio"),
      titulo: opciones.titulo || "", medallaAuto: !!opciones.medalla, textoIG: opciones.textoIG || "" };
    G = armarDesde(origen, opciones.plantilla);
    guardar();
  }

  // en los textos de las placas solo va lo argentino: de un podio o listado de países se queda con lo de ARG
  function soloArg(txt) {
    const esArgTxt = (s) => /\bARG\b|argentin|🇦🇷/i.test(s);
    const cods = [...txt.matchAll(/\(([A-Z]{3})\)/g)].map((m) => m[1]);
    const podio = /^\s*(podio|clasificaci[oó]n|posiciones|top \d)/i.test(txt) || /^\s*(\d{1,2}\s*[°º.)]|(oro|plata|bronce|1ro|2do|3ro)\s*[:\-–])/i.test(txt);
    if (cods.length >= 2) {
      const partes = txt.split(/\s*[;,|]\s*|\s+[-–]\s+(?=\d)/).filter(Boolean);
      if (podio || partes.length >= 3) { const arg = partes.filter(esArgTxt); return arg.length ? arg.join(", ") : null; }
      return txt; // "X (ARG) le ganó a Y (BRA)": es de un argentino, queda
    }
    if (podio && cods.length === 1 && !esArgTxt(txt)) return null;
    return txt;
  }

  // ---- de un evento a placas: solo lo importante y corto ----
  // Señales de que una línea es un resultado (las de fecha, lugar, horario o "compitieron 24" no van a la gráfica)
  const ES_RESULTADO = /medall|dorad|platead|bronce|\bgan[oó]|venci[oó]|cay[oó]|perdi[oó]|empat|campe[oó]n|subcampe|podio|r[eé]cord|clasific|\d+\s*[°º]|\bfinal\b|\d+\s*-\s*\d+|\bvs\.?\b|puesto|termin[oó]|lleg[oó]|eliminad|avanz|pas[oó] a/i;
  const TITULO_NO = /^(fecha|lugar|sede|horario|cronograma|c[oó]mo (ver|seguir)|transmisi|links?|fuentes?|inscript|participan|delegaci[oó]n)/i;
  // acorta una línea: primera oración, sin aclaraciones largas entre paréntesis (los tiempos y países quedan)
  function corta(t) {
    t = t.replace(/\s*\((?![A-Z]{3}\)|\d)[^)]{25,}\)/g, "").trim();
    const primera = t.split(/(?<=[a-záéíóú0-9)])\.\s+(?=[A-ZÁÉÍÓÚ])/)[0];
    if (primera.length >= 25) t = primera;
    if (t.length > 130) t = t.slice(0, 130).replace(/\s+\S*$/, "") + "…";
    return t.replace(/\.$/, "");
  }
  const MED = { oro: /dorad|\boro\b/i, plata: /platead|\bplata\b/i, bronce: /bronce/i };

  function armarDesde(o, plantilla) {
    let placas = [];
    const lineas = [], agregados = [];
    let actual = null, medalla = null, vioSub = false;
    const fnMedalla = o.medallaAuto || plantilla === "medalla" ? window.tipoMedalla : null;
    for (const b of o.bloques) {
      if (b.tipo === "espacio") { actual = null; continue; } // un renglón vacío en el Doc corta la placa
      const txt = b.tipo === "texto" ? soloArg(limpio(b.partes) || "") : limpio(b.partes);
      if (!txt || /^corrección:/i.test(txt)) continue;
      if (b.tipo === "texto" && /:\s*$/.test(txt) && txt.length < 60) continue; // "Resumen de medallas de Argentina:" sobra (la placa ya dice Medallero) // las correcciones son para el agente, no para la gráfica
      if (b.tipo === "texto" || b.tipo === "sub") lineas.push(txt);
      if (!medalla && fnMedalla && (b.tipo === "texto" || b.tipo === "sub")) {
        const m = fnMedalla(b.partes);
        if (m) medalla = { clave: m.clave, texto: txt };
      }
      if (b.agregado && b.tipo === "texto") { agregados.push({ txt, med: window.tipoMedalla?.(b.partes)?.clave }); continue; }
      if (b.tipo === "sub") { vioSub = true; actual = { titulo: txt.replace(/:\s*$/, ""), texto: [] }; placas.push(actual); }
      else if (b.tipo === "texto") { if (!actual) { actual = { titulo: "", texto: [], intro: !vioSub }; placas.push(actual); } actual.texto.push(corta(txt)); }
    }
    // los datos agregados (amarillo) van donde corresponden: una medalla a su placa de medallas, si nombra una prueba a esa placa
    for (const a of agregados) {
      const t = corta(a.txt), pal = sinTildesG(a.txt);
      const destino = (a.med && placas.find((pl) => MED[a.med].test(pl.titulo)))
        || placas.find((pl) => pl.titulo && sinTildesG(pl.titulo).split(/\s+/).filter((w) => w.length > 3).some((w) => pal.includes(w)));
      if (destino) destino.texto.push(t);
      else if (a.med) placas.unshift({ titulo: "Medalla", texto: [t] }); // una medalla nueva sin placa: va primero
      else (placas.find((pl) => /otros/i.test(pl.titulo)) || placas[placas.push({ titulo: "", texto: [] }) - 1]).texto.push(t);
    }
    // afuera: placas de fecha, lugar, horarios... y textos sueltos que no traen ningún resultado
    const conRes = (pl) => pl.texto.some((x) => ES_RESULTADO.test(x));
    const hayRes = placas.some(conRes); // si no hay ningún resultado (ej. una noticia), queda todo
    placas = placas.filter((pl) => pl.texto.length && !TITULO_NO.test(pl.titulo) && (!hayRes || conRes(pl)));
    placas = placas.map((pl) => (pl.titulo ? pl : { ...pl, titulo: pl.texto.some((x) => /medall/i.test(x)) ? "Medallero" : "Resultado" }));
    // en una placa de medallas no hace falta repetir "ganó la medalla DORADA en": queda "Micaela Levaggi – Milla (4:58.6)"
    const REPITE = /\s+(?:gan[oó]|se colg[oó]|obtuvo|consigui[oó]|logr[oó]|conquist[oó])\s+(?:la\s+)?medalla\s+(?:de\s+)?(?:dorada|plateada|bronce|oro|plata)\s*(?:en\s+(?:el|la|los|las)\s+|en\s+)?/i;
    placas = placas.map((pl) => (Object.values(MED).some((r) => r.test(pl.titulo)) ? { ...pl, texto: pl.texto.map((x) => x.replace(REPITE, " – ")) } : pl));
    // muchas medallas (ej. 29): se agrupan por color, una línea por persona con todas sus pruebas ("Ana – Senior, Copa y Panamericano")
    const lineasMed = [];
    if (window.tipoMedalla) for (const b of o.bloques) {
      if (b.tipo !== "texto" || !b.partes) continue;
      const m = window.tipoMedalla(b.partes); const t = limpio(b.partes);
      const varias = (t.match(/dorad|platead|bronce/gi) || []).length > 1 || /medallero/i.test(t); // "7 DORADAS, 12 PLATEADAS…" es el resumen, no una medalla
      if (m && t && !varias && soloArg(t)) lineasMed.push({ clave: m.clave, t });
    }
    const porColor = lineasMed.length >= 6;
    if (porColor) {
      const CORTE = /\s+(?:les?\s+)?(?:gan[oó]|ganaron|se colg[oó]|se colgaron|obtuvo|obtuvieron|consigui[oó]|consiguieron|logr[oó]|lograron|conquist[oó]|conquistaron|se qued[oó]|se quedaron)\s+(?:con\s+)?(?:la\s+)?medalla\s+(?:de\s+)?(?:dorada|plateada|bronce|oro|plata)\s*(?:en\s+(?:el|la|los|las)\s+|en\s+)?/i;
      const NOMBRE = { oro: "DORADAS", plata: "PLATEADAS", bronce: "DE BRONCE" };
      const intro = placas.filter((pl) => pl.intro).map((pl) => ({ ...pl, titulo: "Medallero", texto: pl.texto.filter((x) => ES_RESULTADO.test(x)) })).filter((pl) => pl.texto.length);
      const grupos = [];
      for (const k of ["oro", "plata", "bronce"]) {
        const quien = new Map();
        for (const l of lineasMed.filter((x) => x.clave === k)) {
          const [nom, ...resto] = l.t.split(CORTE);
          const prueba = resto.join(" ").replace(/\.$/, "").trim();
          if (!quien.has(nom)) quien.set(nom, []);
          if (prueba) quien.get(nom).push(prueba);
        }
        const filas = [...quien].map(([nom, pr]) => pr.length ? `${nom} – ${pr.length > 1 ? pr.slice(0, -1).join(", ") + " y " + pr.at(-1) : pr[0]}` : nom);
        // hasta 4 renglones y ~260 letras por placa, así la letra no queda chiquita
        let pl = null;
        for (const f of filas) {
          if (!pl || pl.texto.length >= 4 || pl.texto.join("").length + f.length > 260) { pl = { titulo: NOMBRE[k], texto: [] }; grupos.push(pl); }
          pl.texto.push(f);
        }
      }
      // muchas medallas: en el carrusel van solo las doradas; plateadas y bronces quedan para el texto del posteo (Copiar para IG)
      const doradas = grupos.filter((g) => g.titulo === NOMBRE.oro);
      // el número del resumen del Doc manda (una línea puede tener más de una medalla)
      const todo = lineas.join(" ");
      const delDoc = { plata: (todo.match(/(\d+)\s+platead/i) || [])[1], bronce: (todo.match(/(\d+)\s+(?:de\s+)?bronce/i) || [])[1] };
      const cuenta = (k) => +delDoc[k] || lineasMed.filter((x) => x.clave === k).length;
      const resto = [cuenta("plata") && `${cuenta("plata")} ${cuenta("plata") > 1 ? "PLATEADAS" : "PLATEADA"}`, cuenta("bronce") && `${cuenta("bronce")} de BRONCE`].filter(Boolean);
      const cierre = resto.length ? [{ titulo: "Y además", texto: [`${resto.join(" y ")}`, "Todos los nombres, en el posteo"] }] : [];
      placas = [...intro, ...(doradas.length ? doradas : grupos.slice(0, 2)), ...cierre];
    }
    // máximo 3 renglones por placa: si hay más, sigue en otra placa con el mismo título (así la letra no queda chiquita)
    if (!porColor) placas = placas.flatMap((pl) => { const r = []; for (let i = 0; i < pl.texto.length; i += 3) r.push({ ...pl, texto: pl.texto.slice(i, i + 3) }); return r; });
    if (!plantilla) plantilla = medalla && o.medallaAuto && !porColor ? "medalla" : "carrusel";
    const acento = plantilla === "medalla" ? "naranja" : undefined;
    const tipoPlaca = plantilla === "lateral" ? "lateral" : "placa";
    const lasPlacas = placas.slice(0, 9).map((pl) => pag(tipoPlaca, { titulo: pl.titulo, texto: pl.texto.join("\n"), credito: "", acento }));
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
      const pls = placas.slice(0, 6).map((pl) => pag("s-texto", { ...base, titulo: pl.titulo, texto: pl.texto.join("\n") }));
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
    } else if (["convocados", "grupos", "s-convocados", "s-grupos", "fixture", "agenda", "clasificados", "clasificado", "sede", "s-sede"].includes(plantilla)) {
      const ej = PLANTILLAS[plantilla].paginas()[0];
      const vacio = Object.fromEntries(Object.keys(ej.datos).map((k) => [k, ""]));
      const conv = { titulo: "Convocados", lista: lineas.filter((l) => l.length < 60).join("\n") };
      const sedeX = { etiqueta: "¡Es oficial!", evento: o.evento, ciudad: "", fechas: "" };
      const extra = { convocados: conv, "s-convocados": conv, grupos: { grupos: "" }, "s-grupos": { grupos: "" }, fixture: { partidos: "" }, sede: sedeX, "s-sede": sedeX,
        agenda: { titulo: "Agenda del día", items: "" }, clasificados: { titulo: "Clasificados a Los Ángeles 2028", lista: "" },
        clasificado: { titulo: "¡Clasificó a Los Ángeles 2028!", detalle: lineas[0] || "" } }[plantilla];
      pags = [pag(plantilla, { ...vacio, deporte: o.deporte, torneo: o.evento, ...extra })];
      if (plantilla === "sede" || plantilla === "s-sede") pags[0].datos.credito = "";
    } else {
      pags = [pag("portada", { ...base, titulo: o.titulo || tituloAuto(lineas, lineasMed) }), ...lasPlacas];
    }
    if (pags.length === 1 && TIPOS[pags[0].tipo].formato === "feed" && ["carrusel", "medalla", "lateral"].includes(plantilla)) pags.push(pag("placa", { titulo: "Título", texto: "", credito: "", acento }));
    return { plantilla, sel: 0, paginas: pags, origen: o };
  }

  // título de la portada cuando el evento no trae uno
  function tituloAuto(lineas, meds) {
    const total = +((lineas.join(" ").match(/(\d+)\s+medallas/i) || [])[1] || meds.length);
    if (total > 1) return `¡${total} medallas para Argentina!`;
    if (meds.length === 1) return { oro: "¡Medalla DORADA!", plata: "¡Medalla PLATEADA!", bronce: "¡Medalla de BRONCE!" }[meds[0].clave];
    if (lineas.some((l) => /campeon(es|as)\b/i.test(l))) return "¡Campeones!";
    if (lineas.some((l) => /campe[oó]n(a)?\b/i.test(l))) return "¡Campeón!";
    if (lineas.some((l) => /clasific/i.test(l))) return "¡Clasificados!";
    return "Así le fue a Argentina";
  }

  // abre una plantilla con datos ya cargados (ej. desde la pestaña 🎯 Clasificados)
  function conDatos(plantilla, datos) { G = nuevo(plantilla); Object.assign(G.paginas[0].datos, datos); guardar(); }
  window.Graficas = { dibujar, desdeEvento, conDatos };
})();
