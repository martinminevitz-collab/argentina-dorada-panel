"""Dónde y cómo se guardan los datos. Todo vive en la carpeta data/ del repositorio.

data/
  hallazgos/AAAA/MM/AAAA-MM-DD.json   -> lo que encontraron los bots ese día
  vistos.json                         -> huellas de lo ya encontrado (para no repetir)
  indice.json                         -> lista de días disponibles (la usa el panel)
  ultima-corrida.json                 -> resumen de la última vuelta de cada bot
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DATA = RAIZ / "data"
HALLAZGOS = DATA / "hallazgos"
AR = timezone(timedelta(hours=-3))

DIAS_QUE_SE_RECUERDAN = 60   # después de esto, una noticia vieja puede volver a aparecer
DIAS_EN_INDICE = 30          # cuántos días muestra el panel


def ahora():
    return datetime.now(AR)


def leer(ruta, por_defecto):
    try:
        return json.loads(Path(ruta).read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return por_defecto


def escribir(ruta, datos):
    ruta = Path(ruta)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def archivo_del_dia(fecha=None):
    f = fecha or ahora()
    return HALLAZGOS / f"{f:%Y}" / f"{f:%m}" / f"{f:%Y-%m-%d}.json"


def cargar_vistos():
    return leer(DATA / "vistos.json", {})


def guardar_vistos(vistos):
    limite = (ahora() - timedelta(days=DIAS_QUE_SE_RECUERDAN)).strftime("%Y-%m-%d")
    escribir(DATA / "vistos.json", {k: v for k, v in sorted(vistos.items()) if v >= limite})


def sumar_hallazgos(nuevos):
    """Agrega los hallazgos nuevos al archivo de hoy y actualiza el índice."""
    ruta = archivo_del_dia()
    actuales = leer(ruta, [])
    actuales.extend(nuevos)
    actuales.sort(key=lambda h: h.get("publicado") or h["encontrado"], reverse=True)
    escribir(ruta, actuales)
    actualizar_indice()
    return ruta


def actualizar_indice():
    archivos = sorted(HALLAZGOS.glob("*/*/*.json"), reverse=True)[:DIAS_EN_INDICE]
    dias = []
    for a in archivos:
        items = leer(a, [])
        dias.append({
            "fecha": a.stem,
            "archivo": str(a.relative_to(DATA)).replace("\\", "/"),
            "cantidad": len(items),
        })
    escribir(DATA / "indice.json", {"actualizado": ahora().isoformat(timespec="minutes"), "dias": dias})


def anotar_corrida(bot, resumen):
    datos = leer(DATA / "ultima-corrida.json", {})
    datos[bot] = {"cuando": ahora().isoformat(timespec="minutes"), **resumen}
    escribir(DATA / "ultima-corrida.json", datos)
