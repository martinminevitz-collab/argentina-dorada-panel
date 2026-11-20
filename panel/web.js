// SECCIÓN WEB – revisar y publicar lo que está en la web (argentinadorada.com.ar) sin entrar a WordPress.
// Cada persona conecta SU usuario de la web con una "contraseña de aplicación" (se crea en su perfil de WordPress).
// La clave queda guardada solo en este navegador. Si se pierde el equipo, se borra desde el perfil de WordPress.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CLAVE = "ad_web_conexion";
  const WEB = "https://argentinadorada.com.ar";

  const TIPOS = {
    notas: { nombre: "Notas", ruta: "posts", campos: ["bajada", "seccion"] },
    atletas: { nombre: "Atletas", ruta: "atletas", campos: ["ad_especialidad", "ad_club", "ad_ciudad"] },
    medallas: { nombre: "Medallas", ruta: "medallas", campos: ["ad_metal", "ad_prueba"], sinFoto: true },
  };
  const ETIQUETAS = { ad_especialidad: "Especialidad / disciplina", ad_club: "Club", ad_ciudad: "Ciudad", ad_prueba: "Prueba", ad_metal: "Metal" };

  const est = { tipo: "notas", estado: "draft", buscar: "", pagina: 1, total: 0, items: [], secciones: null, msj: "" };

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

  // ---------- conexión ----------
  function cajaConexion(lista) {
    const c = conexion();
    const caja = document.createElement("section");
    caja.className = "w-caja";
    if (c) {
      caja.innerHTML = `<p>Conectado a la web como <strong>${esc(c.nombre)}</strong>. <button type="button" class="w-link">Desconectar</button></p>`;
      $("button", caja).onclick = () => { localStorage.removeItem(CLAVE); dibujar(lista); };
      return caja;
    }
    caja.innerHTML = `
      <h2>Conectar con la web</h2>
      <ol class="w-pasos">
        <li>Entrá a tu <a href="${WEB}/wp-admin/profile.php#application-passwords-section" target="_blank" rel="noopener">perfil de la web</a>.</li>
        <li>Abajo de todo, en <em>Contraseñas de aplicación</em>, escribí <strong>Panel</strong> y tocá <em>Añadir</em>.</li>
        <li>Copiá la contraseña que aparece (se muestra una sola vez) y pegala acá.</li>
      </ol>
      <form class="w-form">
        <label>Tu usuario de la web <input name="usuario" required autocomplete="username"></label>
        <label>Contraseña de aplicación <input name="clave" required autocomplete="off" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"></label>
        <button>Conectar</button>
        <p class="w-msj" role="status"></p>
      </form>`;
    $("form", caja).onsubmit = async (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      const datos = { web: WEB, usuario: f.get("usuario").trim(), clave: f.get("clave").replace(/\s+/g, "") };
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      $(".w-msj", caja).textContent = "Probando…";
      try {
        const { datos: yo } = await api("users/me?context=edit&_fields=name,roles");
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

  // ---------- lista ----------
  async function cargar() {
    const t = TIPOS[est.tipo];
    const q = new URLSearchParams({ status: est.estado, context: "edit", per_page: 20, page: est.pagina, _embed: "wp:featuredmedia" });
    if (est.buscar) q.set("search", est.buscar);
    const { datos, total } = await api(`${t.ruta}?${q}`);
    est.items = est.pagina === 1 ? datos : est.items.concat(datos);
    est.total = total;
    if (est.tipo === "notas" && !est.secciones) est.secciones = (await api("categories?per_page=50&_fields=id,name")).datos;
  }

  async function dibujar(lista) {
    lista.innerHTML = "";
    lista.classList.add("modo-web");
    lista.append(cajaConexion(lista));
    if (!conexion()) return;

    const barra = document.createElement("div");
    barra.className = "w-barra";
    barra.innerHTML = `
      <div class="chips">${Object.entries(TIPOS).map(([k, t]) => `<button type="button" class="chip${k === est.tipo ? " activa" : ""}" data-tipo="${k}">${t.nombre}</button>`).join("")}</div>
      <div class="chips">
        <button type="button" class="chip${est.estado === "draft" ? " activa" : ""}" data-estado="draft">Para revisar (borrador)</button>
        <button type="button" class="chip${est.estado === "publish" ? " activa" : ""}" data-estado="publish">Publicados</button>
      </div>
      <form class="w-buscar"><input type="search" placeholder="Buscar por nombre o título" value="${esc(est.buscar)}"><button>Buscar</button></form>`;
    barra.querySelectorAll("[data-tipo]").forEach((b) => (b.onclick = () => { est.tipo = b.dataset.tipo; est.pagina = 1; dibujar(lista); }));
    barra.querySelectorAll("[data-estado]").forEach((b) => (b.onclick = () => { est.estado = b.dataset.estado; est.pagina = 1; dibujar(lista); }));
    $("form", barra).onsubmit = (ev) => { ev.preventDefault(); est.buscar = $("input", barra).value.trim(); est.pagina = 1; dibujar(lista); };
    lista.append(barra);

    const cont = document.createElement("div");
    cont.innerHTML = `<p class="vacio">Cargando…</p>`;
    lista.append(cont);
    try {
      await cargar();
    } catch (e) {
      cont.innerHTML = `<p class="vacio">No se pudo leer la web: ${esc(e.message)}</p>`;
      return;
    }
    cont.innerHTML = `<p class="w-cuenta">${est.total} ${est.estado === "draft" ? "para revisar" : "publicados"}</p>`;
    if (!est.items.length) cont.insertAdjacentHTML("beforeend", `<p class="vacio">Nada por acá.</p>`);
    for (const it of est.items) cont.append(tarjeta(it, lista));
    if (est.items.length < est.total) {
      const mas = document.createElement("button");
      mas.className = "w-mas";
      mas.textContent = "Ver más";
      mas.onclick = () => { est.pagina++; dibujar(lista); };
      cont.append(mas);
    }
  }

  // ---------- tarjeta editable ----------
  function tarjeta(it, lista) {
    const t = TIPOS[est.tipo];
    const foto = it._embedded?.["wp:featuredmedia"]?.[0];
    const mini = foto?.media_details?.sizes?.medium?.source_url || foto?.source_url || "";
    const art = document.createElement("article");
    art.className = "w-item";
    const campo = (k) => {
      if (k === "bajada") return `<label>Bajada <textarea name="bajada" rows="2">${esc(it.excerpt?.raw ?? "")}</textarea></label>`;
      if (k === "seccion") return `<label>Sección <select name="seccion">${(est.secciones || []).map((s) => `<option value="${s.id}"${it.categories?.includes(s.id) ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>`;
      if (k === "ad_metal") return `<label>Metal <select name="ad_metal">${["oro", "plata", "bronce"].map((m) => `<option${it.meta?.ad_metal === m ? " selected" : ""}>${m}</option>`).join("")}</select></label>`;
      return `<label>${ETIQUETAS[k]} <input name="${k}" value="${esc(it.meta?.[k] ?? "")}"></label>`;
    };
    art.innerHTML = `
      ${t.sinFoto ? "" : `<div class="w-foto">${mini ? `<img src="${esc(mini)}" alt="">` : `<span>Sin foto</span>`}</div>`}
      <form class="w-form">
        <label>${est.tipo === "atletas" ? "Nombre y apellido" : "Título"} <input name="titulo" value="${esc(it.title?.raw ?? "")}"${est.tipo === "medallas" ? " readonly" : ""}></label>
        ${t.campos.map(campo).join("")}
        ${t.sinFoto ? "" : `<label>${mini ? "Cambiar foto" : "Agregar foto"} <input type="file" name="foto" accept="image/*"></label>`}
        <div class="w-acciones">
          <button name="accion" value="guardar">Guardar</button>
          ${it.status === "publish" ? `<button name="accion" value="draft">Volver a borrador</button>` : `<button name="accion" value="publish" class="w-publicar">Guardar y publicar</button>`}
          <a href="${esc(conexion().web)}/wp-admin/post.php?post=${it.id}&action=edit" target="_blank" rel="noopener">Abrir en WordPress</a>
        </div>
        <p class="w-msj" role="status"></p>
      </form>`;

    $("form", art).onsubmit = async (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      const accion = ev.submitter?.value || "guardar";
      const msj = $(".w-msj", art);
      const cuerpo = { meta: {} };
      if (est.tipo !== "medallas") cuerpo.title = f.get("titulo");
      for (const k of t.campos) {
        if (k === "bajada") cuerpo.excerpt = f.get("bajada");
        else if (k === "seccion") cuerpo.categories = [Number(f.get("seccion"))];
        else cuerpo.meta[k] = f.get(k);
      }
      if (accion === "publish" || accion === "draft") cuerpo.status = accion;
      art.querySelectorAll("button").forEach((b) => (b.disabled = true));
      try {
        const archivo = f.get("foto");
        if (archivo && archivo.size) {
          msj.textContent = "Subiendo foto…";
          const { datos: media } = await api("media", { metodo: "POST", archivo });
          cuerpo.featured_media = media.id;
        }
        msj.textContent = "Guardando…";
        const { datos } = await api(`${t.ruta}/${it.id}?context=edit`, { metodo: "POST", cuerpo });
        Object.assign(it, datos);
        if (accion === "publish" || accion === "draft") {
          art.replaceWith(Object.assign(document.createElement("p"), { className: "w-hecho", textContent: `«${datos.title?.raw || "Listo"}» ${accion === "publish" ? "quedó publicado" : "volvió a borrador"}.` }));
          est.total--;
        } else {
          msj.textContent = "Guardado.";
          if (cuerpo.featured_media) dibujar(lista);
        }
      } catch (e) {
        msj.textContent = "No se pudo guardar: " + e.message;
      } finally {
        art.querySelectorAll("button").forEach((b) => (b.disabled = false));
      }
    };
    return art;
  }

  window.Web = { dibujar };
})();
