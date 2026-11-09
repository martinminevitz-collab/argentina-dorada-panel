// Panel Argentina Dorada – lee lo que guardan los bots en data/ y lo muestra.
// Las "vistas" se guardan en este dispositivo (más adelante pasan a una base de datos compartida).

const DATA = "data/";
const estado = { tab: "resultado", items: [], vistas: cargarVistas() };
const $ = (s) => document.querySelector(s);

function cargarVistas() {
  try { return new Set(JSON.parse(localStorage.getItem("ad-vistas") || "[]")); } catch { return new Set(); }
}
function guardarVistas() {
  try { localStorage.setItem("ad-vistas", JSON.stringify([...estado.vistas].slice(-3000))); } catch {}
}

async function bajarJSON(ruta) {
  const r = await fetch(DATA + ruta + "?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error(ruta + " → " + r.status);
  return r.json();
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

async function cargar() {
  $("#recargar").classList.add("girando");
  try {
    const dias = Number($("#rango").value);
    const [indice, corrida] = await Promise.all([
      bajarJSON("indice.json"),
      bajarJSON("ultima-corrida.json").catch(() => ({})),
    ]);
    mostrarEstado(corrida);
    const archivos = indice.dias.slice(0, dias);
    const listas = await Promise.all(archivos.map((d) => bajarJSON(d.archivo).catch(() => [])));
    estado.items = listas.flat();
    llenarDeportes();
    dibujar();
  } catch (e) {
    $("#estado-bots").innerHTML = `<span class="mal">Todavía no hay datos de los bots.</span> Se cargan solos en la primera vuelta.`;
    estado.items = [];
    dibujar();
  } finally {
    $("#recargar").classList.remove("girando");
  }
}

function mostrarEstado(corrida) {
  const r = corrida.resultados;
  if (!r) { $("#estado-bots").textContent = "El bot todavía no corrió."; return; }
  const caidas = r.fuentes_caidas?.length
    ? ` · <span class="mal">${r.fuentes_caidas.length} web(s) no respondieron</span>` : "";
  $("#estado-bots").innerHTML =
    `<span class="ok">●</span> <b>Bot de resultados</b> corrió ${haceCuanto(r.cuando)} · ` +
    `<b>${r.nuevos}</b> nuevas de ${r.revisadas} revisadas${caidas}`;
  if (r.fuentes_caidas?.length) $("#estado-bots").title = "No respondieron: " + r.fuentes_caidas.join(", ");
}

function llenarDeportes() {
  const sel = $("#deporte"), actual = sel.value;
  const deportes = [...new Set(estado.items.map((i) => i.deporte))].sort((a, b) => a.localeCompare(b, "es"));
  sel.innerHTML = `<option value="">Todos los deportes</option>` +
    deportes.map((d) => `<option>${escapar(d)}</option>`).join("");
  sel.value = deportes.includes(actual) ? actual : "";
}

function pasaFiltros(i, tab) {
  if (tab === "resultado" && i.tipo !== "resultado") return false;
  if (tab === "agenda" && i.tipo !== "agenda") return false;
  if (tab === "ba" && !i.en_buenos_aires) return false;
  if (!$("#ver-vistas").checked && estado.vistas.has(i.id)) return false;
  const dep = $("#deporte").value;
  if (dep && i.deporte !== dep) return false;
  const q = $("#buscar").value.trim().toLowerCase();
  if (q && !`${i.titulo} ${i.resumen} ${i.fuente} ${i.deporte}`.toLowerCase().includes(q)) return false;
  return true;
}

function dibujar() {
  for (const b of document.querySelectorAll(".pestanas button")) {
    b.classList.toggle("activa", b.dataset.tab === estado.tab);
    b.querySelector(".n").textContent = estado.items.filter((i) => pasaFiltros(i, b.dataset.tab)).length || "";
  }
  const lista = $("#lista");
  lista.innerHTML = "";
  const items = estado.items.filter((i) => pasaFiltros(i, estado.tab));
  if (!items.length) {
    lista.innerHTML = `<p class="vacio">Nada por acá. Probá con más días o mirá "Todo".</p>`;
    return;
  }
  let diaActual = "";
  const tpl = $("#tpl-tarjeta");
  for (const i of items) {
    const dia = (i.encontrado || "").slice(0, 10);
    if (dia !== diaActual) {
      diaActual = dia;
      const h = document.createElement("h3");
      h.className = "dia";
      h.textContent = new Date(dia + "T12:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
      lista.append(h);
    }
    const t = tpl.content.firstElementChild.cloneNode(true);
    t.querySelector(".deporte").textContent = i.deporte;
    const tipo = t.querySelector(".tipo");
    tipo.textContent = { resultado: "Resultado", agenda: "Agenda", otro: "Otro" }[i.tipo] || i.tipo;
    tipo.classList.add(i.tipo);
    t.querySelector(".ba").hidden = !i.en_buenos_aires;
    const a = t.querySelector("h2 a");
    a.href = i.link; a.textContent = i.titulo;
    t.querySelector(".resumen").textContent = i.resumen && !i.resumen.startsWith(i.titulo) ? i.resumen : "";
    t.querySelector(".meta").textContent = `${i.fuente || ""} · ${haceCuanto(i.publicado || i.encontrado)}`;
    t.classList.toggle("vista", estado.vistas.has(i.id));
    t.querySelector(".vista").onclick = () => {
      estado.vistas.has(i.id) ? estado.vistas.delete(i.id) : estado.vistas.add(i.id);
      guardarVistas(); dibujar();
    };
    t.querySelector(".copiar").onclick = async () => {
      try { await navigator.clipboard.writeText(`${i.titulo}\n${i.link}`); avisar("Copiado"); }
      catch { avisar("No se pudo copiar"); }
    };
    lista.append(t);
  }
}

function avisar(txt) {
  const a = $("#aviso"); a.textContent = txt; a.hidden = false;
  clearTimeout(avisar.t); avisar.t = setTimeout(() => (a.hidden = true), 1600);
}
function escapar(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

document.querySelectorAll(".pestanas button").forEach((b) => (b.onclick = () => { estado.tab = b.dataset.tab; dibujar(); }));
["#buscar", "#deporte", "#ver-vistas"].forEach((s) => $(s).addEventListener("input", dibujar));
$("#rango").addEventListener("change", cargar);
$("#recargar").onclick = cargar;
document.addEventListener("visibilitychange", () => { if (!document.hidden) cargar(); });

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
cargar();
