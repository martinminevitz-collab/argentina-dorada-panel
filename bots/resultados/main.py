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
from datetime import datetime, timedelta, timezone

from bots.comun import guardar, texto
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


def procesar(crudos, deporte, filtrar_argentina, vistos, ya_hoy, contadores, deportes=None):
    nuevos = []
    for c in crudos:
        titulo = texto.limpiar_titulo(c["titulo"])
        todo = f'{titulo} {c.get("resumen", "")}'
        if not titulo or not c.get("link"):
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

    deportes = cargar_config("deportes.json")["deportes"]
    print("🔎 Google Noticias, deporte por deporte")
    for d in deportes:
        if not d.get("activo", True):
            continue
        crudos = lectores.leer_google_noticias(d)
        contadores["revisadas"] += len(crudos)
        nuevos += procesar(crudos, d["nombre"], True, vistos, ya_hoy, contadores)
        time.sleep(1.5)  # para que Google no nos bloquee

    print("🌐 Webs fijas")
    for f in cargar_config("fuentes.json")["fuentes"]:
        if not f.get("activo", True):
            continue
        leer = lectores.leer_rss if f["tipo"] == "rss" else lectores.leer_web
        crudos = leer(f["url"], f["nombre"])
        if not crudos:
            contadores["fuentes_caidas"].append(f["nombre"])
        contadores["revisadas"] += len(crudos)
        nuevos += procesar(crudos, None, f.get("filtrar_argentina", True), vistos, ya_hoy, contadores, deportes)

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
