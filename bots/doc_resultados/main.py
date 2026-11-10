"""LECTOR DEL DOC – Argentina Dorada
Lee el Doc "Resultados desde Claude" (publicado en la web) y lo pasa a data/doc-resultados.json
para que el panel muestre cada evento en su recuadro, con el mismo formato del Doc.
No usa IA (cero tokens). Corre cada hora en GitHub Actions.

Para probarlo:  python -m bots.doc_resultados.main
"""
import hashlib
import json
import re
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup

from bots.comun import guardar
from bots.comun.red import bajar

ROJO = ("#ff0000", "#cc0000", "#e06666", "#ea4335", "#c00000", "#980000")
GRIS = ("#999999", "#666666", "#b7b7b7", "#cccccc", "#808080", "#a6a6a6", "#888888")
AZUL_ETIQUETA = ("#0000ff", "#1155cc", "#4a86e8", "#3c78d8", "#0b5394", "#1c4587", "#3d85c6", "#0070c0")


def estilos_por_clase(sopa):
    """Google arma clases tipo .c6{font-weight:700}. Las paso a {clase: {negrita, color}}."""
    css = " ".join(s.get_text() for s in sopa.find_all("style"))
    clases = {}
    for nombre, cuerpo in re.findall(r"\.(c\d+)\{([^}]*)\}", css):
        d = clases.setdefault(nombre, {})
        if re.search(r"font-weight:\s*(700|bold)", cuerpo):
            d["b"] = True
        m = re.search(r"(?<![-\w])color:\s*(#[0-9a-fA-F]{6})", cuerpo)
        if m:
            d["color"] = m.group(1).lower()
    return clases


def estilo(span, clases):
    e = {}
    for c in span.get("class", []):
        e.update(clases.get(c, {}))
    return e


def link_real(href):
    """Google envuelve los links: google.com/url?q=LINK_REAL&..."""
    if href and "google.com/url" in href:
        q = parse_qs(urlparse(href).query).get("q")
        if q:
            return q[0]
    return href


def color_corto(hexa):
    if not hexa:
        return None
    if hexa in ROJO:
        return "rojo"
    if hexa in GRIS:
        return "gris"
    if hexa in AZUL_ETIQUETA:
        return "azul"
    return None


def leer_parrafo(nodo, clases):
    """Devuelve una lista de pedacitos: {t: texto, b: negrita, c: color, href: link}."""
    partes = []
    for span in nodo.find_all("span", recursive=False) or [nodo]:
        e = estilo(span, clases)
        a = span.find("a")
        texto = span.get_text()
        if not texto:
            continue
        p = {"t": texto}
        if e.get("b"):
            p["b"] = True
        c = color_corto(e.get("color"))
        if c and not a:
            p["c"] = c
        if a:
            p["href"] = link_real(a.get("href"))
        # se juntan pedacitos seguidos con el mismo estilo
        if partes and {k: v for k, v in partes[-1].items() if k != "t"} == {k: v for k, v in p.items() if k != "t"}:
            partes[-1]["t"] += texto
        else:
            partes.append(p)
    # el Doc a veces tiene ** literales alrededor del título: se sacan
    for p in partes:
        p["t"] = p["t"].replace("**", "").replace(" ", " ")
    return [p for p in partes if p["t"]]


def texto_de(partes):
    return "".join(p["t"] for p in partes).strip()


def separar_titulo(texto):
    """'FUTSAL - FINALISSIMA EN ... (6 al 8 de noviembre)' -> deporte, evento, fechas"""
    fechas = None
    m = re.search(r"\(([^()]*\d[^()]*(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|confirmar)[^()]*)\)", texto, re.I)
    if m:
        fechas = m.group(1).strip()
    deporte, sep, evento = texto.partition(" - ")
    if not sep or len(deporte) > 40:
        deporte, evento = "", texto
    if m:  # las fechas se muestran aparte
        evento = evento.replace(m.group(0), "").strip(" -–")
    return deporte.strip(), re.sub(r"\s+", " ", evento).strip(), fechas


def _norm(t):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", (t or "").lower()) if unicodedata.category(c) != "Mn")


def es_multideportivo(titulo):
    cfg = json.loads((guardar.RAIZ / "config" / "multideportivos.json").read_text(encoding="utf-8"))
    t = _norm(titulo)
    return any(p in t for p in cfg["palabras"]) and not any(x in t for x in cfg["excluir"])


def nombre_corto(titulo):
    """'JUEGOS OLÍMPICOS DE LA JUVENTUD DAKAR 2026, SENEGAL' -> 'Dakar 2026'"""
    m = re.search(r"([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+(?: [A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+)?) (\d{4})", titulo)
    if m:
        palabras = m.group(1).split()
        # nos quedamos con la ciudad (la última palabra con mayúscula antes del año)
        ciudad = palabras[-1] if palabras[0].upper() in ("DE", "LA", "JUVENTUD") or len(palabras) == 1 else " ".join(palabras)
        for basura in ("JUVENTUD", "OLIMPICOS", "OLÍMPICOS", "PANAMERICANOS", "SURAMERICANOS", "GAMES", "JUEGOS"):
            if ciudad.upper().startswith(basura + " "):
                ciudad = ciudad[len(basura) + 1:]
        return f"{ciudad.title()} {m.group(2)}"
    return " ".join(titulo.split()[:3]).title()


def es_titulo_deporte(texto, estricto=False):
    t = texto.strip()
    if re.search(r"\bvs\.?\b|\d+\s*hs\b|\d+-\d+|\d{1,2}/\d{1,2}", t, re.I):
        return False
    if estricto:
        letras = [c for c in t if c.isalpha()]
        return bool(letras) and all(c.isupper() for c in letras)
    return True


def armar_multideportivo(e):
    """Agrupa los bloques del evento en: general, medallero, días (con deportes y resumen) y deportes."""
    general, dias, medallero = [], [], None
    dia = deporte = None
    en_resumen = en_final = False
    resumen_final = ""
    for b in e["bloques"]:
        texto = texto_de(b.get("partes", [])) if b.get("partes") else ""
        # "## RESUMEN FINAL ..." (al terminar los Juegos): va arriba, antes de los días
        if dia is None and b["tipo"] == "sub" and _norm(texto).startswith("resumen final"):
            en_final = True
            continue
        if en_final and dia is None:
            if b["tipo"] == "sub" and not _norm(texto).startswith("d"):
                en_final = False
            elif b["tipo"] != "sub":
                if b["tipo"] != "espacio":
                    resumen_final += (" " if resumen_final else "") + re.sub(r"^para el posteo:?\s*", "", texto, flags=re.I)
                continue
        if b["tipo"] == "sub" and (re.match(r"^d[ií]a\s*\d+", texto, re.I) or _norm(texto).startswith("dias anteriores")):
            dia = {"titulo": texto, "deportes": [], "resumen": {"destacados": [], "posteo": ""}}
            dias.append(dia); deporte = None; en_resumen = False
            continue
        if dia is None:
            if b["tipo"] == "texto" and _norm(texto).startswith("medallero"):
                medallero = b["partes"]
            general.append(b)
            continue
        if b["tipo"] == "sub" and _norm(texto).startswith("resumen"):
            en_resumen, deporte = True, None
            continue
        if en_resumen:
            if b["tipo"] == "espacio":
                continue
            if _norm(texto).startswith("para el posteo"):
                dia["resumen"]["posteo"] = re.sub(r"^para el posteo:?\s*", "", texto, flags=re.I)
            else:
                dia["resumen"]["destacados"].append(b)
            continue
        # adentro de un día, el deporte va en MAYÚSCULAS ("## NATACIÓN"); una línea en negrita
        # con minúsculas ("**Final vs Portugal el jueves**") es un dato, no un deporte nuevo
        if b["tipo"] == "sub" and es_titulo_deporte(texto, estricto=True):
            deporte = {"nombre": texto.title() if texto.isupper() else texto, "bloques": []}
            dia["deportes"].append(deporte)
            continue
        if deporte is None:
            deporte = {"nombre": "General", "bloques": []}
            dia["deportes"].append(deporte)
        if b["tipo"] == "espacio" and not deporte["bloques"]:
            continue
        deporte["bloques"].append(b)

    for d in dias:
        for dep in d["deportes"]:
            while dep["bloques"] and dep["bloques"][-1]["tipo"] == "espacio":
                dep["bloques"].pop()

    # sin días todavía (formato viejo, por deporte): los deportes salen de las subcategorías generales
    por_deporte = {}
    if dias:
        for d in dias:
            for dep in d["deportes"]:
                por_deporte.setdefault(dep["nombre"], []).append({"dia": d["titulo"], "bloques": dep["bloques"]})
        general_limpio = general
    else:
        general_limpio, actual = [], None
        for b in general:
            if b["tipo"] == "sub" and es_titulo_deporte(texto_de(b["partes"])):
                nombre = texto_de(b["partes"])
                actual = por_deporte.setdefault(nombre.title() if nombre.isupper() else nombre, [])
                actual.append({"dia": None, "bloques": []})
                continue
            if actual is None:
                general_limpio.append(b)
            elif not (b["tipo"] == "espacio" and not actual[-1]["bloques"]):
                actual[-1]["bloques"].append(b)
    while general_limpio and general_limpio[-1]["tipo"] == "espacio":
        general_limpio.pop()
    e["multi"] = {
        "nombre": nombre_corto(e["titulo"]),
        "general": general_limpio,
        "medallero": medallero,
        "resumen_final": resumen_final.strip(),
        "dias": dias,
        "deportes": [{"nombre": k, "dias": v} for k, v in por_deporte.items()],
    }


def leer_doc(html):
    sopa = BeautifulSoup(html, "html.parser")
    clases = estilos_por_clase(sopa)
    cuerpo = sopa.find("div", class_="doc-content") or sopa.body
    actualizado_doc, seccion, eventos, actual = None, "resultados", [], None

    for nodo in cuerpo.find_all(["p", "ul", "table"], recursive=False):
        if nodo.name == "ul":
            for li in nodo.find_all("li"):
                partes = leer_parrafo(li, clases)
                if not partes:
                    continue
                # título = lo que está en negrita y no es la etiqueta
                etiqueta = None
                titulo_partes = []
                for p in partes:
                    t = p["t"].strip()
                    if re.fullmatch(r"\(?\s*(PUBLICABLE|Necesito más info|NECESITO MÁS INFO)\s*\)?", t, re.I):
                        etiqueta = "publicable" if "PUBLICABLE" in t.upper() else "mas_info"
                    else:
                        titulo_partes.append(p)
                titulo = texto_de(titulo_partes)
                deporte, evento, fechas = separar_titulo(titulo)
                if not etiqueta:
                    etiqueta = "agenda" if seccion == "agenda" else "en_curso"
                actual = {"titulo": titulo, "deporte": deporte, "evento": evento, "fechas": fechas,
                          "etiqueta": etiqueta, "seccion": seccion,
                          "ya_publicado": all(p.get("c") == "gris" for p in titulo_partes),
                          "bloques": []}
                eventos.append(actual)
            continue

        partes = leer_parrafo(nodo, clases)
        texto = texto_de(partes)
        if not actualizado_doc and texto.lower().startswith("última actualización"):
            actualizado_doc = texto.split(":", 1)[1].replace("(hora argentina)", "").strip()
            continue
        if texto.upper() == "AGENDA QUE VIENE":
            seccion, actual = "agenda", None
            continue
        if actual is None:
            continue
        if not texto:
            # renglón vacío: separa subcategorías (máximo uno seguido)
            if actual["bloques"] and actual["bloques"][-1]["tipo"] != "espacio":
                actual["bloques"].append({"tipo": "espacio"})
            continue
        if any(p.get("href") for p in partes) and texto.startswith("http"):
            tipo = "link"
        elif all(p.get("b") for p in partes if p["t"].strip()):
            tipo = "sub"
        else:
            tipo = "texto"
        actual["bloques"].append({"tipo": tipo, "partes": partes})

    for e in eventos:
        while e["bloques"] and e["bloques"][-1]["tipo"] == "espacio":
            e["bloques"].pop()
        base = re.sub(r"\([^)]*\)", "", e["titulo"]).lower()
        e["id"] = hashlib.sha1(re.sub(r"[^a-z0-9]", "", base).encode()).hexdigest()[:12]
        # huella del contenido: si cambia después de marcarlo "Publicado", el panel avisa que hay novedades
        e["version"] = hashlib.sha1(json.dumps(e["bloques"], ensure_ascii=False).encode()).hexdigest()[:10]
        if es_multideportivo(e["titulo"]):
            e["multideportivo"] = True
            armar_multideportivo(e)
        e["publicado_en_doc"] = e["ya_publicado"] or (
            bool(e["bloques"]) and all(p.get("c") == "gris" for b in e["bloques"] if b.get("partes") for p in b["partes"]))
    return actualizado_doc, eventos


def main():
    url = json.loads((guardar.RAIZ / "config" / "doc.json").read_text(encoding="utf-8"))["pub"]
    html = bajar(url)
    if not html:
        guardar.anotar_corrida("doc", {"ok": False, "error": "No se pudo leer el Doc publicado"})
        print("⚠️  No se pudo leer el Doc")
        return
    actualizado_doc, eventos = leer_doc(html)
    ruta = guardar.DATA / "doc-resultados.json"
    anterior = guardar.leer(ruta, {})
    nuevo = {"actualizado_doc": actualizado_doc, "eventos": eventos}
    if {k: anterior.get(k) for k in nuevo} != nuevo:   # solo se guarda si cambió algo
        guardar.escribir(ruta, {"leido": guardar.ahora().isoformat(timespec="minutes"), **nuevo})
    por = {k: sum(e["etiqueta"] == k for e in eventos) for k in ("publicable", "en_curso", "mas_info", "agenda")}
    guardar.anotar_corrida("doc", {"ok": True, "eventos": len(eventos), **por, "actualizado_doc": actualizado_doc})
    print(f"✅ Doc leído: {len(eventos)} eventos {por}")


if __name__ == "__main__":
    main()
