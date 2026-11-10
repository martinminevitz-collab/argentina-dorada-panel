"""Reglas para entender un título/resumen: ¿es argentino?, ¿es resultado o agenda?, ¿es en Buenos Aires?"""
import hashlib
import json
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
FILTROS = json.loads((RAIZ / "config" / "filtros.json").read_text(encoding="utf-8"))


def sin_acentos(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def normalizar(s):
    """minúsculas, sin acentos ni signos, con espacios a los costados.
    Así se buscan palabras enteras: 'oro' no aparece dentro de 'decoro'."""
    s = sin_acentos((s or "").lower())
    s = re.sub(r"[^\w]+", " ", s)
    return f" {s.strip()} "


def _lista(clave):
    return [f" {normalizar(p).strip()} " for p in FILTROS[clave] if normalizar(p).strip()]


ARG = _lista("señales_argentina")
EXCLUIR = _lista("excluir_si_aparece")
RESULTADO = _lista("palabras_resultado")
AGENDA = _lista("palabras_agenda")
LUGARES_BA = _lista("lugares_buenos_aires")
EVENTO = _lista("palabras_evento")


def _alguna(texto, palabras):
    return any(p in texto for p in palabras)


def es_argentino(texto):
    t = normalizar(texto)
    return _alguna(t, ARG) or "🇦🇷" in (texto or "")


def contiene_alguna(texto, reglas):
    """Exclusiones propias de cada deporte (columna EXCLUIR de la planilla).
    Cada regla es 'palabra' o 'palabra SALVO excepción / otra excepción'.
    Ej: 'ATP SALVO campeón / título' -> descarta lo que diga ATP, menos si también dice campeón o título.
    Se busca por comienzo de palabra: 'campeón' también encuentra 'campeona' y 'campeones'."""
    t = normalizar(texto)

    def aparece(p):
        p = normalizar(p).strip()
        return bool(p) and f" {p}" in t

    for regla in reglas:
        palabra, _, salvo = sin_acentos(regla.lower()).partition(" salvo ")
        if aparece(palabra) and not any(aparece(e) for e in salvo.split("/")):
            return True
    return False


def hay_que_excluir(texto):
    return _alguna(normalizar(texto), EXCLUIR)


def clasificar(texto):
    """Devuelve 'resultado', 'agenda' u 'otro'."""
    t = normalizar(texto).replace(" la plata ", " ")  # la ciudad no es una medalla
    r = sum(p in t for p in RESULTADO)
    a = sum(p in t for p in AGENDA)
    if r == 0 and a == 0:
        return "otro"
    return "resultado" if r >= a else "agenda"


def es_evento_en_buenos_aires(texto):
    t = normalizar(texto)
    return _alguna(t, LUGARES_BA) and _alguna(t, EVENTO)


def limpiar_titulo(titulo):
    """Google Noticias agrega ' - Nombre del medio' al final: lo sacamos."""
    return re.sub(r"\s+[-–|]\s+[^-–|]{2,40}$", "", (titulo or "").strip())


def huella(titulo):
    """Identificador corto de una noticia, para no repetirla."""
    t = re.sub(r"[^a-z0-9 ]", "", normalizar(limpiar_titulo(titulo))).split()
    return hashlib.sha1(" ".join(t).encode()).hexdigest()[:12]


def palabras_clave(titulo):
    t = re.sub(r"[^a-z0-9 ]", " ", normalizar(limpiar_titulo(titulo))).split()
    return {w for w in t if len(w) > 3}


def parecidos(a, b, umbral=0.6):
    """Dos títulos que comparten la mayoría de las palabras = misma noticia en otro medio."""
    if not a or not b:
        return False
    return len(a & b) / min(len(a), len(b)) >= umbral
