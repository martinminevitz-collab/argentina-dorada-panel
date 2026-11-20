// Pestañas agrupadas en dos desplegables: "Redes" (lo de siempre: resultados, agenda, noticias, gráficas…)
// y "Web" (secciones de argentinadorada.com.ar). Los botones siguen siendo los mismos [data-tab] que maneja app.js.
(function () {
  const menus = () => document.querySelectorAll(".pestanas .menu");
  const cerrar = (salvo) => menus().forEach((m) => { if (m !== salvo) { m.querySelector(".menu-lista").hidden = true; m.querySelector(".menu-boton").setAttribute("aria-expanded", "false"); } });

  function etiquetas() {
    for (const m of menus()) {
      const web = m.dataset.menu === "web";
      if (web) m.querySelectorAll("[data-web]").forEach((b) => b.classList.toggle("activa", b.classList.contains("activa") && b.dataset.web === window.Web?.actual()));
      const activo = m.querySelector(".menu-lista button.activa");
      const boton = m.querySelector(".menu-boton");
      boton.classList.toggle("activa", Boolean(activo));
      boton.querySelector(".menu-actual").textContent = activo ? activo.firstChild.textContent.trim() : "";
    }
  }

  document.addEventListener("click", (ev) => {
    const boton = ev.target.closest(".menu-boton");
    if (boton) {
      const m = boton.closest(".menu"), lista = m.querySelector(".menu-lista");
      cerrar(m);
      lista.hidden = !lista.hidden;
      boton.setAttribute("aria-expanded", String(!lista.hidden));
      return;
    }
    const opcion = ev.target.closest(".menu-lista button[data-tab]");
    if (opcion) {
      if (opcion.dataset.web) window.Web?.irA(opcion.dataset.web); // antes de que app.js dibuje
      cerrar();
      setTimeout(etiquetas, 0);
      return;
    }
    if (!ev.target.closest(".menu")) cerrar();
  }, true);
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") cerrar(); });

  // Cada vez que el panel redibuja las pestañas (clases "activa"), actualizar los nombres de los menús.
  new MutationObserver(() => etiquetas()).observe(document.querySelector(".pestanas"), { subtree: true, attributes: true, attributeFilter: ["class"] });
  etiquetas();
})();
