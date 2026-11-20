// SECCIÓN WEB – todo el contenido de argentinadorada.com.ar desde el panel: crear, editar, publicar y eliminar,
// sin entrar a WordPress. Cada persona conecta SU usuario de la web con una "contraseña de aplicación" (se crea en
// su perfil de WordPress); queda guardada solo en este navegador y se puede revocar desde ese perfil.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CLAVE = "ad_web_conexion";
  const WEB = "https://argentinadorada.com.ar";

  // Campos: [clave, etiqueta, tipo]. Tipos: texto, area, fecha, url, metal, cuerpo (editor), deporte, edicion,
  // atletas (varios), nota (una), titulo, bajada, foto. Los "ad_*" son campos propios de la web.
  const SECCIONES = {
    notas: { nombre: "Notas", nueva: "Nueva nota", ruta: "posts", categoria: "notas" },
    entrevistas: { nombre: "Entrevistas", nueva: "Nueva entrevista", ruta: "posts", categoria: "entrevistas" },
    investigaciones: { nombre: "Investigaciones", nueva: "Nueva investigación", ruta: "posts", categoria: "investigaciones" },
    atletas: { nombre: "Atletas", nueva: "Nuevo atleta", ruta: "atletas" },
    medallas: { nombre: "Medallas", nueva: "Nueva medalla", ruta: "medallas" },
    agenda: { nombre: "Agenda", nueva: "Nuevo evento", ruta: "eventos" },
    resultados: { nombre: "Resultados", nueva: "Nuevo resultado", ruta: "resultados" },
  };
  const NOTA = [["foto", "Foto principal", "foto"], ["credito", "Crédito de la foto (sale debajo de la foto; ej.: Foto: COA)", "credito"], ["titulo", "Título", "titulo"], ["bajada", "Bajada", "bajada"], ["cuerpo", "Texto de la nota", "cuerpo"],
    ["seccion", "Sección", "seccion"], ["deporte", "Deporte", "deporte"], ["ad_atleta", "Atletas de la nota", "atletas"], ["ad_video_youtube", "Video de YouTube (link)", "url"],
    ["sticky", "Nota destacada de la portada (si hay varias marcadas, sale la más nueva)", "destacada"]];
  const CAMPOS = {
    notas: NOTA, entrevistas: NOTA, investigaciones: NOTA,
    atletas: [["foto", "Foto", "foto"], ["ad_nombre", "Nombre", "texto"], ["ad_apellido", "Apellido", "texto"], ["deporte", "Deporte", "deporte"],
      ["ad_especialidad", "Especialidad / disciplina", "texto"], ["ad_nacimiento", "Fecha de nacimiento", "fecha"], ["ad_ciudad", "Ciudad", "texto"],
      ["ad_club", "Club", "texto"], ["ad_instagram", "Instagram (link)", "url"], ["ad_foto_creditos", "Créditos de la foto", "texto"], ["cuerpo", "Biografía y títulos", "cuerpo"]],
    medallas: [["ad_metal", "Metal", "metal"], ["edicion", "Edición", "edicion"], ["deporte", "Deporte", "deporte"], ["ad_prueba", "Prueba", "texto"],
      ["ad_equipo", "Nombre del equipo (si es de equipo)", "texto"], ["ad_atleta", "Atletas", "atletas"], ["ad_deportistas_txt", "Deportistas (texto original)", "area"]],
    agenda: [["titulo", "Evento", "titulo"], ["ad_inicio", "Empieza", "fecha"], ["ad_fin", "Termina", "fecha"], ["ad_lugar", "Lugar", "texto"],
      ["ad_link", "Link oficial", "url"], ["deporte", "Deporte", "deporte"], ["ad_atleta", "Atletas que participan", "atletas"], ["cuerpo", "Detalle", "cuerpo"]],
    resultados: [["titulo", "Título interno", "titulo"], ["ad_fecha", "Fecha", "fecha"], ["ad_competencia", "Torneo / competencia", "texto"],
      ["ad_resultado", "Resultado", "texto"], ["deporte", "Deporte", "deporte"], ["ad_atleta", "Atletas", "atletas"], ["ad_nota", "Nota relacionada", "nota"]],
  };

  const est = { seccion: "notas", estado: "draft", buscar: "", edicion: "", pagina: 1, total: 0, items: [], cat: null, deportes: null, ediciones: null };

  function conexion() { try { return JSON.parse(localStorage.getItem(CLAVE)) || null; } catch { return null; } }

  async function api(ruta, { metodo = "GET", cuerpo, archivo } = {}) {
    const c = conexion();
    const credencial = btoa(unescape(encodeURIComponent(c.usuario + ":" + c.clave)));
    // "X-AD-Auth" lleva lo mismo: el hosting de la web descarta "Authorization" y el plugin lo lee de ahí.
    const cab = { Authorization: "Basic " + credencial, "X-AD-Auth": credencial };
    let body;
    if (archivo) {
      cab["Content-Type"] = archivo.type || "image/jpeg";
      cab["Content-Disposition"] = `attachment; filename="${encodeURIComponent(archivo.name.replace(/"/g, ""))}"`;
      body = archivo;
    } else if (cuerpo) {
      cab["Content-Type"] = "application/json";
      body = JSON.stringify(cuerpo);
    }
    const r = await fetch(`${c.web}/wp-json/wp/v2/${ruta}`, { method: metodo, headers: cab, body });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(datos.message || `La web respondió ${r.status}`);
    return { datos, total: Number(r.headers.get("X-WP-Total") || 0) };
  }
  // Todas las páginas de una lista corta (deportes, ediciones, secciones).
  async function todo(ruta) {
    let pag = 1, sal = [];
    for (;;) {
      const { datos } = await api(`${ruta}${ruta.includes("?") ? "&" : "?"}per_page=100&page=${pag}`);
      sal = sal.concat(datos);
      if (datos.length < 100) return sal;
      pag++;
    }
  }

  // ---------- conexión ----------
  function cajaConexion(lista) {
    const c = conexion();
    const caja = document.createElement("section");
    caja.className = "cuenta w-cuenta-web";
    if (c) {
      caja.innerHTML = `Web: <b>argentinadorada.com.ar</b> · conectado como <b>${esc(c.nombre)}</b> · <button type="button" class="link-btn">Desconectar</button>`;
      $("button", caja).onclick = () => { localStorage.removeItem(CLAVE); dibujar(lista); };
      return caja;
    }
    caja.innerHTML = `
      <label><b>Conectá tu usuario de la web</b> (una sola vez por equipo)</label>
      <p class="ayuda">1. Entrá a tu <a href="${WEB}/wp-admin/profile.php#application-passwords-section" target="_blank" rel="noopener">perfil de la web</a>. 2. Abajo de todo, en <em>Contraseñas de aplicación</em>, escribí <b>Panel</b> y tocá <em>Añadir</em>. 3. Copiá la contraseña (se muestra una sola vez) y pegala acá.</p>
      <form class="w-conectar">
        <div class="fila-entrar"><input name="usuario" required autocomplete="username" placeholder="Tu usuario de la web"></div>
        <div class="fila-entrar"><input name="clave" required autocomplete="off" placeholder="Contraseña de aplicación"><button>Conectar</button></div>
        <p class="ayuda w-msj" role="status"></p>
      </form>`;
    $("form", caja).onsubmit = async (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      const datos = { web: WEB, usuario: f.get("usuario").trim(), clave: f.get("clave").replace(/\s+/g, "") };
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      $(".w-msj", caja).textContent = "Probando…";
      try {
        const { datos: yo } = await api("users/me?context=edit&_fields=name");
        localStorage.setItem(CLAVE, JSON.stringify({ ...datos, nombre: yo.name }));
        dibujar(lista);
      } catch (e) {
        localStorage.removeItem(CLAVE);
        // Con el cartel prendido, una clave mala vuelve como "Estamos actualizándonos".
        $(".w-msj", caja).textContent = /actualiz/i.test(e.message) ? "No se reconoció el usuario o la contraseña de aplicación. Revisalos y probá de nuevo." : "No se pudo conectar: " + e.message;
      }
    };
    return caja;
  }

  // ---------- listas de apoyo ----------
  async function apoyo() {
    if (est.ediciones) return;
    // Las tres a la vez (antes una después de la otra): la primera carga tarda la mitad.
    const [cats, deps, eds] = await Promise.all([todo("categories?_fields=id,slug,name"), todo("deportes?_fields=id,name&orderby=name"), todo("ediciones?_fields=id,name,parent&orderby=name")]);
    est.cat = Object.fromEntries(cats.map((c) => [c.slug, c]));
    est.deportes = deps.sort((a, b) => a.name.localeCompare(b.name, "es"));
    const padres = Object.fromEntries(eds.filter((e) => !e.parent).map((e) => [e.id, e.name]));
    est.ediciones = eds.filter((e) => e.parent).map((e) => ({ id: e.id, nombre: e.name, grupo: padres[e.parent] || "Otras" }))
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "es") || b.nombre.localeCompare(a.nombre, "es"));
  }

  // Ediciones agrupadas por competencia (Juegos Olímpicos › Tokio 2020…), para los desplegables.
  function opcionesEdiciones(actual) {
    const grupos = {};
    for (const e of est.ediciones) (grupos[e.grupo] ||= []).push(e);
    return Object.entries(grupos).map(([g, eds]) => `<optgroup label="${esc(g)}">${eds.map((e) => `<option value="${e.id}"${String(e.id) === String(actual ?? "") ? " selected" : ""}>${esc(e.nombre)}</option>`).join("")}</optgroup>`).join("");
  }

  async function cargar() {
    const s = SECCIONES[est.seccion];
    const q = new URLSearchParams({ status: est.estado, context: "edit", per_page: 20, page: est.pagina, _embed: "wp:featuredmedia" });
    if (est.buscar) q.set("search", est.buscar);
    if (s.categoria) q.set("categories", est.cat[s.categoria]?.id || 0);
    if (est.seccion === "medallas" && est.edicion) q.set("ediciones", est.edicion);
    const { datos, total } = await api(`${s.ruta}?${q}`);
    est.items = est.pagina === 1 ? datos : est.items.concat(datos);
    est.total = total;
  }

  // ---------- pantalla ----------
  async function dibujar(lista) {
    lista.innerHTML = "";
    lista.classList.add("modo-web");
    lista.append(cajaConexion(lista));
    if (!conexion()) return;
    const s = SECCIONES[est.seccion];

    const barra = document.createElement("div");
    barra.className = "filtros w-barra";
    barra.innerHTML = `
      <div class="w-cabeza-seccion"><h2>${esc(s.nombre)}</h2><button type="button" class="btn-crear w-nuevo">+ ${esc(s.nueva)}</button></div>
      <div class="chips-filtro">
        <button type="button" class="${est.estado === "draft" ? "activo" : ""}" data-estado="draft">Para revisar</button>
        <button type="button" class="${est.estado === "publish" ? "activo" : ""}" data-estado="publish">Publicados</button>
      </div>
      <form><input type="search" placeholder="Buscar por nombre o título" value="${esc(est.buscar)}"></form>`;
    barra.querySelectorAll("[data-estado]").forEach((b) => (b.onclick = () => { est.estado = b.dataset.estado; est.pagina = 1; dibujar(lista); }));
    $("form", barra).onsubmit = (ev) => { ev.preventDefault(); est.buscar = $("input", barra).value.trim(); est.pagina = 1; dibujar(lista); };
    lista.append(barra);

    const cont = document.createElement("div");
    cont.className = "w-lista";
    cont.innerHTML = `<p class="vacio">Cargando…</p>`;
    lista.append(cont);
    try {
      await apoyo();
      if (est.seccion === "medallas") { // filtro por evento (edición), para revisar las medallas de a una competencia
        const se = document.createElement("select");
        se.setAttribute("aria-label", "Evento");
        se.innerHTML = `<option value="">Todos los eventos</option>` + opcionesEdiciones(est.edicion);
        se.onchange = () => { est.edicion = se.value; est.pagina = 1; dibujar(lista); };
        barra.append(se);
      }
      await cargar();
    } catch (e) {
      cont.innerHTML = `<p class="vacio">No se pudo leer la web: ${esc(e.message)}</p>`;
      return;
    }
    $(".w-nuevo", barra).onclick = () => {
      const nueva = tarjeta({ id: 0, status: "draft", meta: {}, title: { raw: "" } }, lista);
      cont.prepend(nueva);
      $(".cabeza", nueva).click();
      $("input:not([type=file]), .w-editor", nueva)?.focus();
    };
    cont.innerHTML = `<p class="ayuda">${est.total} ${est.estado === "draft" ? "para revisar" : "publicados"}</p>`;
    if (!est.items.length) cont.insertAdjacentHTML("beforeend", `<p class="vacio">Nada por acá.</p>`);
    for (const it of est.items) cont.append(tarjeta(it, lista));
    if (est.items.length < est.total) {
      const mas = document.createElement("button");
      mas.className = "btn-crear w-mas";
      mas.textContent = "Ver más";
      mas.onclick = () => { est.pagina++; dibujar(lista); };
      cont.append(mas);
    }
  }

  // ---------- editor de texto (negrita, cursiva, subtítulo, lista, cita, link, foto) ----------
  function editorTexto(html) {
    const caja = document.createElement("div");
    caja.className = "w-texto";
    caja.innerHTML = `
      <div class="w-herramientas" role="toolbar" aria-label="Formato">
        <button type="button" data-cmd="bold" title="Negrita"><b>N</b></button>
        <button type="button" data-cmd="italic" title="Cursiva"><i>C</i></button>
        <button type="button" data-bloque="h2" title="Subtítulo">Subtítulo</button>
        <button type="button" data-bloque="p" title="Párrafo">Párrafo</button>
        <button type="button" data-cmd="insertUnorderedList" title="Lista">• Lista</button>
        <button type="button" data-bloque="blockquote" title="Cita destacada">“ Cita</button>
        <button type="button" data-link title="Link">Link</button>
        <label class="w-subir-img" title="Foto en el texto">Foto<input type="file" accept="image/*" hidden></label>
      </div>
      <div class="w-editor" contenteditable="true"></div>`;
    const ed = $(".w-editor", caja);
    ed.innerHTML = html || "<p></p>";
    const hacer = (cmd, valor) => { ed.focus(); document.execCommand(cmd, false, valor); };
    caja.querySelectorAll("[data-cmd]").forEach((b) => (b.onclick = () => hacer(b.dataset.cmd)));
    caja.querySelectorAll("[data-bloque]").forEach((b) => (b.onclick = () => hacer("formatBlock", b.dataset.bloque)));
    $("[data-link]", caja).onclick = () => { const url = prompt("Dirección del link (https://…)"); if (url) hacer("createLink", url); };
    $(".w-subir-img input", caja).onchange = async (ev) => {
      const archivo = ev.target.files[0];
      if (!archivo) return;
      try {
        const { datos: media } = await api("media", { metodo: "POST", archivo });
        ed.focus();
        document.execCommand("insertHTML", false, `<figure><img src="${esc(media.source_url)}" alt=""><figcaption>Epígrafe</figcaption></figure><p></p>`);
      } catch (e) { alert("No se pudo subir la foto: " + e.message); }
      ev.target.value = "";
    };
    // Pegar solo texto: evita traer estilos de Word o de otras webs.
    ed.addEventListener("paste", (ev) => { ev.preventDefault(); document.execCommand("insertText", false, ev.clipboardData.getData("text/plain")); });
    caja.valor = () => ed.innerHTML.replace(/<p><br><\/p>/g, "").trim();
    return caja;
  }

  // ---------- selector de atletas (varios) o de una nota ----------
  function selector(nombre, ruta, ids, varios) {
    const caja = document.createElement("div");
    caja.className = "w-selector";
    caja.innerHTML = `<div class="chips w-elegidos"></div><input type="search" placeholder="Escribí para buscar y elegí de la lista"><div class="w-opciones"></div>`;
    const elegidos = new Map();
    const pintar = () => {
      $(".w-elegidos", caja).innerHTML = [...elegidos].map(([id, txt]) => `<span class="chip w-chip">${esc(txt)} <button type="button" data-quitar="${id}" aria-label="Quitar ${esc(txt)}">×</button></span>`).join("");
      caja.querySelectorAll("[data-quitar]").forEach((b) => (b.onclick = () => { elegidos.delete(Number(b.dataset.quitar)); pintar(); }));
    };
    if (ids?.length) api(`${ruta}?include=${ids.join(",")}&status=publish,draft,pending&per_page=50&context=edit&_fields=id,title`).then(({ datos }) => {
      const nombres = Object.fromEntries(datos.map((d) => [d.id, d.title.raw]));
      ids.forEach((id) => elegidos.set(id, nombres[id] || `#${id}`)); pintar();
    }).catch(() => {});
    let espera;
    $("input", caja).oninput = (ev) => {
      clearTimeout(espera);
      const q = ev.target.value.trim();
      if (q.length < 2) { $(".w-opciones", caja).innerHTML = ""; return; }
      espera = setTimeout(async () => {
        const { datos } = await api(`${ruta}?search=${encodeURIComponent(q)}&status=publish,draft,pending&per_page=8&context=edit&_fields=id,title`);
        $(".w-opciones", caja).innerHTML = datos.map((d) => `<button type="button" data-id="${d.id}">${esc(d.title.raw)}</button>`).join("") || `<span class="ayuda">Sin resultados</span>`;
        caja.querySelectorAll(".w-opciones [data-id]").forEach((b) => (b.onclick = () => {
          if (!varios) elegidos.clear();
          elegidos.set(Number(b.dataset.id), b.textContent); pintar();
          $(".w-opciones", caja).innerHTML = ""; $("input", caja).value = "";
        }));
      }, 300);
    };
    caja.dataset.nombre = nombre;
    caja.valor = () => [...elegidos.keys()];
    return caja;
  }

  // ---------- tarjeta: ver, editar, publicar, eliminar ----------
  function tarjeta(it, lista) {
    const s = SECCIONES[est.seccion];
    const campos = CAMPOS[est.seccion];
    const foto = it._embedded?.["wp:featuredmedia"]?.[0];
    const mini = foto?.media_details?.sizes?.medium?.source_url || foto?.source_url || "";
    const art = document.createElement("article");
    art.className = "evento w-item";
    const tieneFoto = campos.some((c) => c[2] === "foto");
    const meta = (k) => it.meta?.[k] ?? "";
    const chips = [
      est.seccion === "medallas" && meta("ad_metal") ? `<span class="chip w-metal-${esc(meta("ad_metal"))}">${esc(meta("ad_metal"))}</span>` : "",
      tieneFoto && it.id && !mini ? `<span class="chip w-sinfoto">Sin foto</span>` : "",
      !it.id ? `<span class="chip manual">Nuevo</span>` : "",
    ].join("");
    // Fecha que importa según el tipo: la de publicación en notas, la del evento o del resultado; ninguna en atletas y medallas.
    const cual = { agenda: meta("ad_inicio"), resultados: meta("ad_fecha") }[est.seccion] ?? (s.categoria ? it.date : "");
    const fecha = it.id && cual ? new Date(cual.length === 10 ? cual + "T12:00" : cual).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "";
    art.innerHTML = `
      <button type="button" class="cabeza" aria-expanded="false">
        <span class="chips">${chips}</span>
        <span class="titulo">${esc(it.title?.raw || (it.id ? "(sin título)" : s.nueva))}</span>
        <span class="fechas">${esc(fecha)}</span>
        <span class="flecha" aria-hidden="true">▾</span>
      </button>
      <div class="detalle" hidden></div>`;
    const cab = $(".cabeza", art);
    const det = $(".detalle", art);
    let armado = false;
    cab.onclick = () => {
      if (!armado) { det.append(formulario(it, s, campos, mini, art, lista)); armado = true; }
      const abierta = art.classList.toggle("abierto");
      cab.setAttribute("aria-expanded", String(abierta));
      det.hidden = !abierta;
    };
    return art;
  }

  function formulario(it, s, campos, mini, art, lista) {
    const form = document.createElement("form");
    form.className = "crear w-editar";
    const extras = {};
    const pieFoto = document.createElement("div");
    pieFoto.innerHTML = it._embedded?.["wp:featuredmedia"]?.[0]?.caption?.rendered || "";
    let credito = pieFoto.textContent.trim();
    for (const [k, etiqueta, tipo] of campos) {
      // El editor y los buscadores no van dentro de <label>: el navegador toma cualquier click adentro
      // como un click en su primer botón (la "N" de negrita, o la × del primer atleta).
      const compuesto = ["cuerpo", "atletas", "nota"].includes(tipo);
      const label = document.createElement(compuesto ? "div" : "label");
      if (compuesto) label.className = "w-campo";
      label.textContent = etiqueta;
      let control;
      if (tipo === "foto") {
        label.innerHTML = `${etiqueta}<div class="w-foto">${mini ? `<img src="${esc(mini)}" alt="">` : `<span>Sin foto</span>`}</div><input type="file" name="foto" accept="image/*">`;
        form.append(label); continue;
      }
      if (tipo === "destacada") {
        label.className = "check";
        label.prepend(Object.assign(document.createElement("input"), { type: "checkbox", name: "sticky", checked: Boolean(it.sticky) }));
        form.append(label); continue;
      }
      // El crédito es el "pie" de la foto en WordPress: se guarda en la propia foto, no en la nota.
      if (tipo === "credito") control = Object.assign(document.createElement("input"), { name: "credito", value: credito });
      else if (tipo === "titulo") control = Object.assign(document.createElement("input"), { name: "titulo", value: it.title?.raw ?? "", required: true });
      else if (tipo === "bajada") control = Object.assign(document.createElement("textarea"), { name: "bajada", rows: 2, value: it.excerpt?.raw ?? "" });
      else if (tipo === "area") control = Object.assign(document.createElement("textarea"), { name: k, rows: 3, value: it.meta?.[k] ?? "" });
      else if (tipo === "cuerpo") { control = editorTexto(it.content?.raw ?? ""); extras.cuerpo = control; }
      else if (tipo === "atletas") { control = selector(k, "atletas", (it.meta?.[k] || []).map(Number).filter(Boolean), true); extras[k] = control; }
      else if (tipo === "nota") { control = selector(k, "posts", it.meta?.[k] ? [Number(it.meta[k])] : [], false); extras[k] = control; }
      else if (tipo === "metal") control = sel("ad_metal", [["oro", "Oro"], ["plata", "Plata"], ["bronce", "Bronce"]], it.meta?.ad_metal);
      else if (tipo === "seccion") control = sel("seccion", ["notas", "entrevistas", "investigaciones"].map((c) => [est.cat[c]?.id, est.cat[c]?.name]).filter((o) => o[0]), it.categories?.[0] || est.cat[s.categoria]?.id);
      else if (tipo === "deporte") control = sel("deporte", [["", "— Elegir —"], ...est.deportes.map((d) => [d.id, d.name])], it.deportes?.[0]);
      else if (tipo === "edicion") {
        control = document.createElement("select"); control.name = "edicion";
        control.innerHTML = `<option value="">— Elegir —</option>` + opcionesEdiciones(it.ediciones?.[0]);
      } else control = Object.assign(document.createElement("input"), { name: k, type: tipo === "fecha" ? "date" : tipo === "url" ? "url" : "text", value: it.meta?.[k] ?? "" });
      label.append(control);
      form.append(label);
    }
    const pie = document.createElement("div");
    pie.className = "pie";
    pie.innerHTML = `
      ${it.id ? `<button type="button" class="w-eliminar">Eliminar</button>` : ""}
      <button name="accion" value="guardar">${it.id ? "Guardar" : "Guardar borrador"}</button>
      ${it.status === "publish" ? `<button name="accion" value="draft">Volver a borrador</button>` : `<button name="accion" value="publish" class="principal">Guardar y publicar</button>`}`;
    form.append(pie, Object.assign(document.createElement("p"), { className: "ayuda w-msj", role: "status" }));

    const msj = $(".w-msj", form);
    const botones = (on) => form.querySelectorAll("button").forEach((b) => (b.disabled = !on));

    $(".w-eliminar", form)?.addEventListener("click", async () => {
      if (!confirm(`¿Eliminar «${it.title?.raw || "esto"}»? Va a la papelera de la web (se puede recuperar desde WordPress durante 30 días).`)) return;
      botones(false); msj.textContent = "Eliminando…";
      try {
        await api(`${s.ruta}/${it.id}`, { metodo: "DELETE" });
        art.replaceWith(Object.assign(document.createElement("p"), { className: "w-hecho", textContent: `«${it.title?.raw || "Listo"}» se mandó a la papelera.` }));
        est.total--;
      } catch (e) { msj.textContent = "No se pudo eliminar: " + e.message; botones(true); }
    });

    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const f = new FormData(form);
      const accion = ev.submitter?.value || "guardar";
      const cuerpo = { meta: {} };
      for (const [k, , tipo] of campos) {
        if (tipo === "titulo") cuerpo.title = f.get("titulo");
        else if (tipo === "bajada") cuerpo.excerpt = f.get("bajada");
        else if (tipo === "destacada") cuerpo.sticky = f.get("sticky") === "on";
        else if (tipo === "cuerpo") cuerpo.content = extras.cuerpo.valor();
        else if (tipo === "seccion") cuerpo.categories = [Number(f.get("seccion"))];
        else if (tipo === "deporte") cuerpo.deportes = f.get("deporte") ? [Number(f.get("deporte"))] : [];
        else if (tipo === "edicion") cuerpo.ediciones = f.get("edicion") ? [Number(f.get("edicion"))] : [];
        else if (tipo === "atletas") cuerpo.meta[k] = extras[k].valor();
        else if (tipo === "nota") cuerpo.meta[k] = extras[k].valor()[0] || 0;
        else if (tipo !== "foto" && tipo !== "credito") cuerpo.meta[k] = f.get(k) ?? "";
      }
      if (est.seccion === "atletas") cuerpo.title = `${cuerpo.meta.ad_nombre} ${cuerpo.meta.ad_apellido}`.trim();
      if (!it.id && !cuerpo.title && est.seccion === "medallas") cuerpo.title = "Medalla"; // la web le arma el título solo
      if (accion === "publish" || accion === "draft") cuerpo.status = accion;
      else if (!it.id) cuerpo.status = "draft";
      botones(false);
      try {
        const archivo = f.get("foto");
        if (archivo && archivo.size) {
          msj.textContent = "Subiendo foto…";
          cuerpo.featured_media = (await api("media", { metodo: "POST", archivo })).datos.id;
        }
        msj.textContent = "Guardando…";
        const { datos } = await api(it.id ? `${s.ruta}/${it.id}?context=edit` : `${s.ruta}?context=edit`, { metodo: "POST", cuerpo });
        const nuevoCredito = (f.get("credito") ?? credito).trim();
        if (datos.featured_media && (nuevoCredito !== credito || (cuerpo.featured_media && nuevoCredito))) {
          await api(`media/${datos.featured_media}`, { metodo: "POST", cuerpo: { caption: nuevoCredito } });
          credito = nuevoCredito;
        }
        const nombre = datos.title?.raw || "Listo";
        if (accion === "publish" || accion === "draft") {
          art.replaceWith(Object.assign(document.createElement("p"), { className: "w-hecho", textContent: `«${nombre}» ${accion === "publish" ? "quedó publicado" : "volvió a borrador"}.` }));
        } else if (!it.id || cuerpo.featured_media) {
          dibujar(lista); // nuevo o con foto nueva: recargar la lista
        } else {
          Object.assign(it, datos);
          $(".titulo", art).textContent = nombre;
          msj.textContent = "Guardado.";
        }
      } catch (e) {
        msj.textContent = "No se pudo guardar: " + e.message;
      } finally {
        if (form.isConnected) botones(true);
      }
    };
    return form;

    function sel(nombre, opciones, actual) {
      const s = document.createElement("select");
      s.name = nombre;
      s.innerHTML = opciones.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(actual ?? "") ? " selected" : ""}>${esc(t)}</option>`).join("");
      return s;
    }
  }

  // Menú Web: elegir sección (lo usa el desplegable de pestañas).
  function irA(seccion) { if (SECCIONES[seccion]) { est.seccion = seccion; est.pagina = 1; est.buscar = ""; } }

  // ---------- puente Doc → web (tanda 16) ----------
  // Una tarjeta de Redes (resultado publicable o evento de agenda) pasa a la web como BORRADOR de Resultado o Evento,
  // con lo que se puede deducir solo: deporte, fechas, lugar, link, texto y atletas que ya existen en la web.
  // Nada se publica: alguien lo revisa en Web → Resultados / Agenda y recién ahí lo publica.
  const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  // "20 al 22 de noviembre", "21 y 22 de noviembre", "21 de noviembre al 1 de diciembre" → ["2026-11-20", "2026-11-22"]
  function fechasDoc(txt, hoy = new Date()) {
    const conAnio = norm(txt).match(/\b(20\d\d)\b/)?.[1]; // "… de 2027"
    const partes = [...norm(txt).replace(/\s*(de\s+)?\b20\d\d\b/g, "").matchAll(/(\d{1,2})(?:\s+de\s+([a-z]+))?/g)].map((m) => ({ dia: Number(m[1]), mes: MESES.indexOf(m[2] ?? "") }));
    for (let i = partes.length - 2; i >= 0; i--) if (partes[i].mes < 0) partes[i].mes = partes[i + 1].mes; // "20 al 22 de nov": el 20 también es de nov
    const ok = partes.filter((p) => p.mes >= 0 && p.dia >= 1 && p.dia <= 31);
    if (!ok.length) return [];
    let anio = hoy.getFullYear();
    if (conAnio) anio = Number(conAnio) - (ok[ok.length - 1].mes < ok[0].mes ? 1 : 0); // el año escrito es el del final
    else if (ok[0].mes < hoy.getMonth() - 6) anio++; // en noviembre, "enero" es del año que viene
    const iso = (p, a) => `${a}-${String(p.mes + 1).padStart(2, "0")}-${String(p.dia).padStart(2, "0")}`;
    const ini = ok[0], fin = ok[ok.length - 1];
    return [iso(ini, anio), iso(fin, fin.mes < ini.mes ? anio + 1 : anio)];
  }

  // El Doc y la web no siempre llaman igual al deporte. Si la web no lo tiene, se crea (ej. "PÁDEL" → "Pádel").
  const ALIAS_DEPORTE = { "gimnasia en trampolin": "gimnasia de trampolin", "gimnasia aerobica": "gimnasia", "pelota vasca": "pelota",
    hockey: "hockey sobre cesped", ecuestre: "equitacion", "rugby 7": "rugby 7s", "tenis adaptado": "tenis", "natacion adaptada": "natacion",
    "tenis de mesa adaptado": "tenis de mesa" };
  async function deporteWeb(nombre) {
    const n = norm(nombre);
    if (!n) return null;
    const hay = est.deportes.find((d) => norm(d.name) === (ALIAS_DEPORTE[n] || n));
    if (hay) return hay;
    // "PÁDEL" → "Pádel", "FÓRMULA 1" → "Fórmula 1"; siglas cortas quedan en mayúscula ("UFC").
    const nuevo = String(nombre).trim().toLowerCase().split(/\s+/).map((p, i) =>
      (p.length <= 3 && /\p{L}/u.test(p) && !["de", "en", "y", "del"].includes(p) ? p.toUpperCase() : i && ["de", "en", "y", "del"].includes(p) ? p : p[0].toUpperCase() + p.slice(1))).join(" ");
    const { datos } = await api("deportes", { metodo: "POST", cuerpo: { name: nuevo } });
    est.deportes.push({ id: datos.id, name: datos.name });
    return datos;
  }

  async function todosLosAtletas() {
    if (!est.atletas) est.atletas = await todo("atletas?status=publish,draft&context=edit&_fields=id,title");
    return est.atletas;
  }

  async function desdeDoc(e) {
    if (!conexion()) throw new Error("Primero conectá tu usuario en el menú 🌐 Web.");
    await apoyo();
    const agenda = e.seccion === "agenda";
    const seccion = agenda ? "agenda" : "resultados";
    const ruta = SECCIONES[seccion].ruta;
    const evento = (e.evento || e.titulo || "").trim();
    // ¿Ya se pasó? (lo puede haber hecho otra persona del equipo)
    const { datos: hay } = await api(`${ruta}?search=${encodeURIComponent(evento)}&status=publish,draft,pending&context=edit&per_page=20&_fields=id,title`);
    if (hay.some((x) => norm(x.title.raw) === norm(evento))) return { seccion, repetido: true };

    const lineas = (e.bloques || []).filter((b) => b.tipo === "texto" || b.tipo === "sub").map((b) => (b.partes || []).map((p) => p.t).join("").trim()).filter(Boolean);
    const link = (e.bloques || []).flatMap((b) => b.partes || []).find((p) => p.href)?.href || "";
    const deporte = await deporteWeb(e.deporte);
    const todoTexto = norm([evento, ...lineas].join(" "));
    const atletas = (await todosLosAtletas()).filter((a) => a.title.raw && todoTexto.includes(norm(a.title.raw))).map((a) => a.id);
    const cuerpo = { title: evento, status: "draft", deportes: deporte ? [deporte.id] : [], meta: { ad_atleta: atletas } };
    if (agenda) {
      const [ini, fin] = fechasDoc(e.fechas || "");
      const lugar = evento.match(/\sEN\s+([^()]+?)\s*(\(|$)/i)?.[1] || "";
      Object.assign(cuerpo.meta, { ad_inicio: ini || "", ad_fin: fin && fin !== ini ? fin : "", ad_lugar: lugar, ad_link: link });
      cuerpo.content = lineas.map((l) => `<p>${esc(l)}</p>`).join("");
    } else {
      // El renglón más largo suele ser el resultado ("Gustavo Fernández le ganó la final…"); se revisa antes de publicar.
      const resultado = lineas.filter((l) => !/^se (jug|corri|disput)/i.test(l)).sort((a, b) => b.length - a.length)[0] || "";
      Object.assign(cuerpo.meta, { ad_fecha: e.terminado_desde || "", ad_competencia: evento, ad_resultado: resultado });
    }
    const { datos } = await api(`${ruta}?context=edit`, { metodo: "POST", cuerpo });
    return { seccion, id: datos.id, atletas: atletas.length, deporte: Boolean(deporte) };
  }

  // Al volver de un "A la web": mostrar los borradores de esa sección.
  function irABorradores(seccion) { irA(seccion); est.estado = "draft"; }

  window.Web = { dibujar, irA, irABorradores, desdeDoc, fechasDoc, conectado: () => Boolean(conexion()), secciones: Object.fromEntries(Object.entries(SECCIONES).map(([k, s]) => [k, s.nombre])), actual: () => est.seccion };
})();
