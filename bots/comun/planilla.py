"""Lee la 'Lista de deportes para Claude' (publicada como CSV) y la junta con config/deportes.json.

- Deportes: los de la planilla. Si el deporte también está en deportes.json, se usan
  esas palabras de búsqueda (ej: Hockey -> 'Leonas OR Leones'). Si no, se busca por el nombre.
- Links: todos menos Instagram. Si un mismo link está en varios deportes, se revisa una sola vez.
- Si la planilla no responde, el bot sigue solo con deportes.json y fuentes.json.
"""
import csv
import io
import json
import re

from bots.comun.guardar import RAIZ
from bots.comun.red import bajar
from bots.comun.texto import normalizar

NO_SE_PUEDEN_LEER = ("instagram.com", "facebook.com", "tiktok.com", "x.com/", "twitter.com", "youtube.com")


def _config(nombre):
    return json.loads((RAIZ / "config" / nombre).read_text(encoding="utf-8"))


def _clave(nombre):
    return re.sub(r"[^a-z0-9]", "", normalizar(nombre))


def _limpiar_link(celda):
    m = re.search(r"https?://\S+", celda or "")
    if not m:
        return None
    link = m.group(0).rstrip(".,;)")
    link = re.sub(r"[?&](utm_[^&]+|fbclid=[^&]+)", "", link).rstrip("?&")  # saca la basura de los links de redes
    return link


def leer_planilla():
    """Devuelve (deportes, fuentes) o (None, None) si la planilla no respondió."""
    cfg = _config("planilla.json")
    contenido = bajar(cfg["csv"], intentos=3)
    if not contenido:
        return None, None
    filas = list(csv.reader(io.StringIO(contenido)))
    inicio = next((i for i, f in enumerate(filas) if f and _clave(f[0]) == "deportes"), 0)

    encabezado = [_clave(c) for c in filas[inicio]] if filas else []
    col_buscar = encabezado.index("buscar") if "buscar" in encabezado else None
    col_excluir = encabezado.index("excluir") if "excluir" in encabezado else None

    def celda(fila, col):
        return fila[col].strip() if col is not None and col < len(fila) else ""

    extras = {_clave(d["nombre"]): d for d in _config("deportes.json")["deportes"]}
    deportes, links = [], {}
    for fila in filas[inicio + 1:]:
        if not fila or not fila[0].strip():
            continue
        nombre = fila[0].strip()
        es_general = _clave(nombre).startswith(cfg["fila_generales"])
        if not es_general:
            extra = extras.get(_clave(nombre), {})
            if extra.get("activo", True):
                # prioridad: columna BUSCAR de la planilla > deportes.json > nombre del deporte
                buscar = celda(fila, col_buscar) or extra.get("buscar", nombre)
                excluir = [x.strip().lower() for x in celda(fila, col_excluir).split(",") if x.strip()]
                deportes.append({"nombre": nombre, "buscar": buscar, "excluir": excluir, "activo": True})
        for i, valor in enumerate(fila[1:], start=1):
            if i in (col_buscar, col_excluir):
                continue
            link = _limpiar_link(valor)
            if not link or any(r in link for r in NO_SE_PUEDEN_LEER):
                continue
            links.setdefault(link, set()).add(None if es_general else nombre)

    fuentes = []
    for link, de in links.items():
        un_deporte = list(de)[0] if len(de) == 1 else None
        dominio = re.sub(r"^https?://(www\.)?", "", link).split("/")[0].lower()
        argentina = dominio.endswith(".ar") or "arg" in dominio or dominio in cfg.get("webs_argentinas", [])
        fuentes.append({
            "nombre": dominio,
            "tipo": "web",
            "url": link,
            # las webs argentinas no hace falta que digan 'Argentina' en cada nota
            "filtrar_argentina": not argentina,
            "deporte": un_deporte,
            "activo": True,
            "de_planilla": True,
        })

    # deportes que están en deportes.json pero no en la planilla: también se buscan
    en_planilla = {_clave(d["nombre"]) for d in deportes}
    for clave, d in extras.items():
        if clave not in en_planilla and d.get("activo", True):
            deportes.append(d)
    return deportes, fuentes
