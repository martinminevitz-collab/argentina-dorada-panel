"""BOT DE RESULTADOS – Argentina Dorada
Corre solo en GitHub Actions. No usa IA (cero tokens).

1. Busca en Google Noticias deporte por deporte (config/deportes.json).
2. Revisa las webs fijas (config/fuentes.json).
3. Se queda solo con lo argentino, saca fútbol/básquet de clubes y lo repetido.
4. Clasifica: resultado / agenda / otro, y marca si es un evento en Buenos Aires.
5. Guarda todo en data/ para el panel y para el agente de Claude.

Para probarlo en tu compu:  python -m bots.resultados.main
"""
import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from bots.comun import guardar, planilla, texto
from bots.resultados import lectores

HORAS_MAXIMAS = 48  # descarta noticias más viejas que esto


def cargar_config(nombre):
    return json.loads((guardar.RAIZ / "config" / nombre).read_text(encoding="utf-8"))


def es_reciente(publicado):
    if not publicado:
        return True  # las webs comunes no traen fecha: la decide "vistos"
    try:
        f = datetime.fromisoformat(publicado)
    except ValueError:
        return True
    return f >= datetime.now(timezone.utc) - timedelta(hours=HORAS_MAXIMAS)


def adivinar_deporte(todo, deportes):
    """Para las webs fijas: busca en el texto el nombre o las palabras del deporte."""
    t = texto.normalizar(todo)
    for d in deportes:
        opciones = [d["nombre"]] + [p for p in d["buscar"].replace("(", " ").replace(")", " ").split(" OR ")]
        for p in opciones:
            p = texto.normalizar(p).strip()
            if len(p) > 3 and f" {p} " in t:
                return d["nombre"]
    return "Sin clasificar"


def procesar(crudos, deporte, filtrar_argentina, vistos, ya_hoy, contadores, deportes=None,
             exigir_dato=False, solo_memorizar=False):
    """exigir_dato: en webs comunes, solo pasa lo que suena a resultado o agenda (no menús ni 'Contacto').
    solo_memorizar: primera vez que se lee una web -> se anota todo como visto pero no se muestra
    (si no, el primer día aparecerían todas las notas viejas de esa web)."""
    nuevos = []
    for c in crudos:
        titulo = texto.limpiar_titulo(c["titulo"])
        todo = f'{titulo} {c.get("resumen", "")}'
        if not titulo or not c.get("link"):
            continue
        if solo_memorizar:
            vistos[texto.huella(titulo)] = guardar.ahora().strftime("%Y-%m-%d")
            continue
        if exigir_dato and texto.clasificar(todo) == "otro":
            continue
        if not es_reciente(c.get("publicado")):
            contadores["viejas"] += 1
            continue
        if filtrar_argentina and not texto.es_argentino(todo):
            contadores["no_argentinas"] += 1
            continue
        if texto.hay_que_excluir(todo):
            contadores["excluidas"] += 1
            continue
        h = texto.huella(titulo)
        claves = texto.palabras_clave(titulo)
        if h in vistos or any(texto.parecidos(claves, otra) for otra in ya_hoy):
            contadores["repetidas"] += 1
            continue
        vistos[h] = guardar.ahora().strftime("%Y-%m-%d")
        ya_hoy.append(claves)
        nuevos.append({
            "id": h,
            "titulo": titulo,
            "resumen": c.get("resumen", "")[:300],
            "link": c["link"],
            "fuente": c.get("fuente"),
            "deporte": deporte or adivinar_deporte(todo, deportes or []),
            "tipo": texto.clasificar(todo),
            "en_buenos_aires": texto.es_evento_en_buenos_aires(todo),
            "publicado": c.get("publicado"),
            "encontrado": guardar.ahora().isoformat(timespec="minutes"),
            "bot": "resultados",
        })
    return nuevos


def main():
    inicio = time.time()
    vistos = guardar.cargar_vistos()
    # títulos de hoy, para no repetir la misma noticia contada por otro medio
    ya_hoy = [texto.palabras_clave(h["titulo"]) for h in guardar.leer(guardar.archivo_del_dia(), [])]
    contadores = {"revisadas": 0, "viejas": 0, "no_argentinas": 0, "excluidas": 0, "repetidas": 0, "fuentes_caidas": []}
    nuevos = []

    deportes, fuentes_planilla = planilla.leer_planilla()
    if deportes is None:
        print("⚠️  La planilla no respondió: uso solo config/deportes.json")
        contadores["fuentes_caidas"].append("Planilla de deportes")
        deportes, fuentes_planilla = cargar_config("deportes.json")["deportes"], []
    print(f"📋 {len(deportes)} deportes y {len(fuentes_planilla)} webs de la planilla")

    print("🔎 Google Noticias, deporte por deporte")
    for d in deportes:
        if not d.get("activo", True):
            continue
        crudos = lectores.leer_google_noticias(d)
        contadores["revisadas"] += len(crudos)
        nuevos += procesar(crudos, d["nombre"], True, vistos, ya_hoy, contadores)
        time.sleep(1.5)  # para que Google no nos bloquee

    # webs fijas (fuentes.json) + webs de la planilla, sin repetir links
    fuentes, urls = [], set()
    for f in cargar_config("fuentes.json")["fuentes"] + fuentes_planilla:
        clave = f["url"].rstrip("/").replace("://www.", "://")
        if f.get("activo", True) and clave not in urls:
            urls.add(clave)
            fuentes.append(f)

    print(f"🌐 {len(fuentes)} webs (de a varias a la vez)")
    conocidas = guardar.leer(guardar.DATA / "fuentes-conocidas.json", {})

    def leer_fuente(f):
        leer = lectores.leer_rss if f["tipo"] == "rss" else lectores.leer_web
        return f, leer(f["url"], f["nombre"])

    with ThreadPoolExecutor(max_workers=8) as pool:
        for f, crudos in pool.map(leer_fuente, fuentes):
            if not crudos:
                contadores["fuentes_caidas"].append(f["nombre"])
                continue
            contadores["revisadas"] += len(crudos)
            nueva = f["url"] not in conocidas
            conocidas.setdefault(f["url"], guardar.ahora().strftime("%Y-%m-%d"))
            nuevos += procesar(crudos, f.get("deporte"), f.get("filtrar_argentina", True), vistos, ya_hoy,
                               contadores, deportes, exigir_dato=(f["tipo"] == "web"), solo_memorizar=nueva)
    guardar.escribir(guardar.DATA / "fuentes-conocidas.json", conocidas)

    if nuevos:
        guardar.sumar_hallazgos(nuevos)
    else:
        guardar.actualizar_indice()
    guardar.guardar_vistos(vistos)

    por_tipo = {t: sum(n["tipo"] == t for n in nuevos) for t in ("resultado", "agenda", "otro")}
    resumen = {"nuevos": len(nuevos), **por_tipo,
               "en_buenos_aires": sum(n["en_buenos_aires"] for n in nuevos),
               **contadores, "segundos": round(time.time() - inicio)}
    guardar.anotar_corrida("resultados", resumen)
    print(f"✅ Listo: {json.dumps(resumen, ensure_ascii=False)}")


if __name__ == "__main__":
    main()
