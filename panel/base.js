// Base compartida (Supabase): login por mail y "Publicado" sincronizado entre todos.
// Si config.js no tiene los datos, no hace nada y el panel sigue guardando en el dispositivo.
(function () {
  const cfg = window.AD_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  let cliente = null, sesion = null, miembro = false, canal = null;

  const Base = {
    configurada: () => Boolean(cfg.supabaseUrl && cfg.supabaseKey && window.supabase),
    activa: () => Boolean(cliente && sesion && miembro),
    mail: () => sesion?.user?.email || null,

    async iniciar() {
      const caja = $("#cuenta");
      if (!Base.configurada()) { caja.hidden = true; return; }
      caja.hidden = false;
      cliente = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
      $("#form-entrar").onsubmit = entrar;
      $("#form-codigo").onsubmit = confirmarCodigo;
      $("#otro-mail").onclick = () => { $("#form-codigo").hidden = true; $("#form-entrar").hidden = false; $("#cuenta-msj").textContent = ""; };
      $("#salir").onclick = async () => { await cliente.auth.signOut(); };
      cliente.auth.onAuthStateChange((_ev, s) => { sesion = s; refrescar(); });
      const { data } = await cliente.auth.getSession();
      sesion = data.session; refrescar();
    },

    async marcar(e) {
      const { error } = await cliente.from("publicados").upsert({
        evento_id: e.id, version: e.version, titulo: e.titulo, marcado_por: Base.mail(), marcado_en: new Date().toISOString(),
      });
      if (error) throw error;
    },
    async desmarcar(e) {
      const { error } = await cliente.from("publicados").delete().eq("evento_id", e.id);
      if (error) throw error;
    },

    // eventos cargados a mano desde el panel ("+ Crear evento")
    async crearManual(datos) {
      const { error } = await cliente.from("eventos_manuales").insert(datos);
      if (error) throw error;
      await traerManuales();
    },
    // datos agregados a un evento ("+ Agregar dato")
    async agregarDato(datos) {
      const { error } = await cliente.from("eventos_agregados").insert(datos);
      if (error) throw error;
      await traerAgregados();
    },
    async borrarDato(id) {
      const { error } = await cliente.from("eventos_agregados").delete().eq("id", id);
      if (error) throw error;
      await traerAgregados();
    },
    // acreditaciones (pestaña Bs. As.)
    async crearAcred(datos) {
      const { error } = await cliente.from("acreditaciones").insert(datos);
      if (error) throw error;
      await traerAcreditaciones();
    },
    async cambiarAcred(id, cambios) {
      const { error } = await cliente.from("acreditaciones").update({ ...cambios, actualizado_en: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await traerAcreditaciones();
    },
    async borrarAcred(id) {
      const { error } = await cliente.from("acreditaciones").delete().eq("id", id);
      if (error) throw error;
      await traerAcreditaciones();
    },
    nombre: () => {
      const m = (window.__miembros || []).find((x) => (x.email || "").toLowerCase() === (Base.mail() || "").toLowerCase());
      return m?.nombre || (Base.mail() || "").split("@")[0];
    },
    async borrarManual(id) {
      const { error } = await cliente.from("eventos_manuales").delete().eq("id", id);
      if (error) throw error;
      await traerManuales();
    },
  };

  async function entrar(ev) {
    ev.preventDefault();
    const mail = $("#mail").value.trim();
    if (!mail) return;
    $("#form-entrar button").disabled = true;
    const { error } = await cliente.auth.signInWithOtp({
      email: mail, options: { emailRedirectTo: location.origin + location.pathname },
    });
    $("#form-entrar button").disabled = false;
    if (error) { $("#cuenta-msj").textContent = /rate|seconds/i.test(error.message || "") ? "Esperá un minuto antes de pedir otro mail." : "No se pudo mandar el mail. Probá en un rato."; return; }
    // con el código no hace falta abrir el link: sirve también en la app instalada en el celu
    $("#form-entrar").hidden = true; $("#form-codigo").hidden = false; $("#codigo").value = ""; $("#codigo").focus();
    $("#cuenta-msj").textContent = "Te mandamos un mail a " + mail + " (mirá también en spam).";
  }

  async function confirmarCodigo(ev) {
    ev.preventDefault();
    const token = $("#codigo").value.replace(/\D/g, "");
    if (token.length < 6) return;
    $("#form-codigo button").disabled = true;
    const { error } = await cliente.auth.verifyOtp({ email: $("#mail").value.trim(), token, type: "email" });
    $("#form-codigo button").disabled = false;
    if (error) { $("#cuenta-msj").textContent = "Código incorrecto o vencido. Pedí uno nuevo con \"Usar otro mail\"."; return; }
    $("#form-codigo").hidden = true; $("#form-entrar").hidden = false; $("#cuenta-msj").textContent = "";
  }

  async function refrescar() {
    miembro = false;
    if (canal) { cliente.removeChannel(canal); canal = null; }
    if (!sesion) { mostrar("fuera"); window.alCambiarPublicados?.(null); window.alCambiarManuales?.(null); window.alCambiarAgregados?.(null); window.alCambiarAcred?.(null); return; }
    const { data, error } = await cliente.from("miembros").select("email").limit(1);
    miembro = !error && data.length > 0;
    if (!miembro) { mostrar("sin-permiso"); window.alCambiarPublicados?.(null); window.alCambiarManuales?.(null); window.alCambiarAgregados?.(null); window.alCambiarAcred?.(null); return; }
    mostrar("dentro");
    const m = await cliente.from("miembros").select("email, nombre");
    window.__miembros = m.data || [];
    await Promise.all([traerPublicados(), traerManuales(), traerAgregados(), traerAcreditaciones()]);
    canal = cliente.channel("publicados")
      .on("postgres_changes", { event: "*", schema: "public", table: "publicados" }, traerPublicados)
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos_manuales" }, traerManuales)
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos_agregados" }, traerAgregados)
      .on("postgres_changes", { event: "*", schema: "public", table: "acreditaciones" }, traerAcreditaciones)
      .subscribe();
  }

  async function traerPublicados() {
    const { data, error } = await cliente.from("publicados").select("evento_id, version, marcado_por");
    if (error) return;
    const mapa = {};
    for (const f of data) mapa[f.evento_id] = { v: f.version, por: f.marcado_por };
    window.alCambiarPublicados?.(mapa);
  }

  async function traerAgregados() {
    const { data, error } = await cliente.from("eventos_agregados").select("id, evento_id, evento_titulo, tipo, texto, creado_en").order("creado_en");
    if (error) return; // si la tabla todavía no existe, el panel usa la copia del bot
    window.alCambiarAgregados?.(data);
  }

  async function traerAcreditaciones() {
    const { data, error } = await cliente.from("acreditaciones").select("*").order("creado_en");
    if (error) { window.alCambiarAcred?.(false); return; } // false = la tabla todavía no existe (falta correr el SQL)
    window.alCambiarAcred?.(data);
  }

  async function traerManuales() {
    const { data, error } = await cliente.from("eventos_manuales").select("*").order("creado_en", { ascending: false });
    if (error) return; // si la tabla todavía no existe, el panel usa la copia del bot
    window.alCambiarManuales?.(data);
  }

  function mostrar(modo) {
    $("#form-entrar").hidden = modo !== "fuera";
    $("#sesion").hidden = modo === "fuera";
    $("#cuenta-msj").textContent = "";
    if (modo === "dentro") $("#sesion-txt").innerHTML = `<span class="ok">●</span> Conectado: <b>${Base.mail()}</b><br>"Publicado" lo ven todos`;
    if (modo === "sin-permiso") $("#sesion-txt").innerHTML = `<span class="mal">●</span> ${Base.mail()} todavía no está habilitado. Pedile a Martín que lo agregue.`;
  }

  window.Base = Base;
})();
