"""Cómo se lee cada tipo de fuente. Todos devuelven una lista de 'crudos':
{titulo, resumen, link, fuente, publicado (iso o None)}"""
import calendar
from datetime import datetime, timezone
from urllib.parse import quote_plus, urljoin

import feedparser
from bs4 import BeautifulSoup

from bots.comun.red import bajar

GOOGLE_NOTICIAS = "https://news.google.com/rss/search?q={q}&hl=es-419&gl=AR&ceid=AR:es-419"


def _fecha(entrada):
    t = entrada.get("published_parsed") or entrada.get("updated_parsed")
    if not t:
        return None
    return datetime.fromtimestamp(calendar.timegm(t), tz=timezone.utc).isoformat(timespec="minutes")


def _texto_html(html):
    return BeautifulSoup(html or "", "html.parser").get_text(" ", strip=True)


def leer_rss(url, nombre_fuente):
    contenido = bajar(url)
    if not contenido:
        return []
    feed = feedparser.parse(contenido)
    salida = []
    for e in feed.entries:
        fuente = nombre_fuente
        if e.get("source") and e.source.get("title"):
            fuente = e.source.title  # en Google Noticias, el medio real
        salida.append({
            "titulo": (e.get("title") or "").strip(),
            "resumen": _texto_html(e.get("summary"))[:400],
            "link": e.get("link"),
            "fuente": fuente,
            "publicado": _fecha(e),
        })
    return salida


def leer_google_noticias(deporte, dias=2):
    """Busca en Google Noticias Argentina: '<deporte> argentina' de los últimos días."""
    consulta = f'({deporte["buscar"]}) (argentina OR argentino OR argentinos) when:{dias}d'
    return leer_rss(GOOGLE_NOTICIAS.format(q=quote_plus(consulta)), "Google Noticias")


def leer_web(url, nombre_fuente):
    """Página común: se queda con los links que tienen un texto largo (títulos de notas)."""
    html = bajar(url)
    if not html:
        return []
    sopa = BeautifulSoup(html, "html.parser")
    for basura in sopa(["script", "style", "nav", "footer", "header", "form"]):
        basura.decompose()
    vistos, salida = set(), []
    for a in sopa.find_all("a", href=True):
        titulo = a.get_text(" ", strip=True)
        if len(titulo) < 25 or len(titulo) > 220:
            continue
        link = urljoin(url, a["href"])
        if link in vistos:
            continue
        vistos.add(link)
        # el texto que rodea al link a veces trae el país o la bandera
        contexto = a.find_parent(["article", "li", "tr", "div"])
        resumen = contexto.get_text(" ", strip=True)[:400] if contexto else ""
        salida.append({"titulo": titulo, "resumen": resumen, "link": link,
                       "fuente": nombre_fuente, "publicado": None})
    return salida
