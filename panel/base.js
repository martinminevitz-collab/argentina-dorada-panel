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
    $("#cuenta-msj").textContent = error
      ? "No se pudo mandar el mail. Probá en un rato."
      : "Listo: revisá tu mail y tocá el link para entrar (mirá también en spam).";
  }

  async function refrescar() {
    miembro = false;
    if (canal) { cliente.removeChannel(canal); canal = null; }
    if (!sesion) { mostrar("fuera"); window.alCambiarPublicados?.(null); window.alCambiarManuales?.(null); return; }
    const { data, error } = await cliente.from("miembros").select("email").limit(1);
    miembro = !error && data.length > 0;
    if (!miembro) { mostrar("sin-permiso"); window.alCambiarPublicados?.(null); window.alCambiarManuales?.(null); return; }
    mostrar("dentro");
    await Promise.all([traerPublicados(), traerManuales()]);
    canal = cliente.channel("publicados")
      .on("postgres_changes", { event: "*", schema: "public", table: "publicados" }, traerPublicados)
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos_manuales" }, traerManuales)
      .subscribe();
  }

  async function traerPublicados() {
    const { data, error } = await cliente.from("publicados").select("evento_id, version, marcado_por");
    if (error) return;
    const mapa = {};
    for (const f of data) mapa[f.evento_id] = { v: f.version, por: f.marcado_por };
    window.alCambiarPublicados?.(mapa);
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
