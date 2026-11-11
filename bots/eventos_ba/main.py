"""EVENTOS EN BUENOS AIRES – Argentina Dorada
Lee la(s) planilla(s) de eventos para cubrir en Buenos Aires y CABA (CSV publicado, ver config/eventos-ba.json)
y guarda data/eventos-ba.json para la pestaña "📍 Bs. As." del panel. Saca los que ya terminaron.
También guarda la lista de lugares de Buenos Aires (config/filtros.json) para que el panel sume
los eventos de la Agenda que son en Buenos Aires. Sin IA, cero tokens.

Para probarlo:  python -m bots.eventos_ba.main
"""
import csv
import io
import re
from datetime import date, timedelta

from bots.comun import guardar
from bots.comun.red import bajar
from bots.comun.texto import normalizar


def cabecera(t):
    """'Fecha  inicio ' -> 'FECHA INICIO' (sin tildes ni espacios de más)."""
    import unicodedata
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode()
    return " ".join(t.upper().split())

COLUMNAS = {"deporte": "DEPORTE", "evento": "EVENTO", "inicio": "FECHA INICIO", "fin": "FECHA FINAL",
            "lugar": "LUGAR", "fuente": "FUENTE", "nota": "NOTA"}


def fecha(txt):
    """'15/11/2026', '15/11', '2026-11-15' -> date (o None)."""
    txt = (txt or "").strip()
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", txt)
    if m:
        return date(int(m[1]), int(m[2]), int(m[3]))
    m = re.match(r"^(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?", txt)
    if m:
        anio = int(m[3]) if m[3] else date.today().year
        if anio < 100:
            anio += 2000
        try:
            return date(anio, int(m[2]), int(m[1]))
        except ValueError:
            return None
    return None


def leer_csv(url):
    texto = bajar(url)
    filas = list(csv.reader(io.StringIO(texto)))
    # la fila de títulos es la primera que tiene "EVENTO"
    for i, fila in enumerate(filas):
        cab = [cabecera(c) for c in fila]
        if "EVENTO" in cab:
            idx = {k: cab.index(v) for k, v in COLUMNAS.items() if v in cab}
            for f in filas[i + 1:]:
                ev = {k: (f[j].strip() if j < len(f) else "") for k, j in idx.items()}
                if ev.get("evento"):
                    yield ev
            return


def main():
    cfg = guardar.leer(guardar.RAIZ / "config" / "eventos-ba.json", {})
    filtros = guardar.leer(guardar.RAIZ / "config" / "filtros.json", {})
    hoy = date.today()
    eventos, vistos = [], set()
    for url in cfg.get("csv", []):
        try:
            for ev in leer_csv(url):
                ini, fin = fecha(ev.get("inicio")), fecha(ev.get("fin"))
                if (fin or ini) and (fin or ini) < hoy - timedelta(days=1):
                    continue  # ya pasó
                clave = normalizar(ev["evento"]) + (ev.get("inicio") or "")
                if clave in vistos:
                    continue
                vistos.add(clave)
                ev["orden"] = (ini or fin or date(2100, 1, 1)).isoformat()
                eventos.append(ev)
        except Exception as e:
            print(f"⚠️  No se pudo leer una planilla de eventos: {e}")
    eventos.sort(key=lambda e: e["orden"])
    nuevo = {"_nota": "Eventos para cubrir en Buenos Aires y CABA (de la planilla). 'lugares' = palabras para reconocer eventos de Bs. As. en la Agenda.",
             "lugares": filtros.get("lugares_buenos_aires", []), "eventos": eventos}
    ruta = guardar.DATA / "eventos-ba.json"
    if guardar.leer(ruta, {}) != nuevo:
        guardar.escribir(ruta, nuevo)
    print(f"✅ Eventos Bs. As.: {len(eventos)} que vienen ({len(cfg.get('csv', []))} planilla/s)")


if __name__ == "__main__":
    main()
