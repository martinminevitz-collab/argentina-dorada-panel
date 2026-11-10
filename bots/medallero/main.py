"""MEDALLERO OFICIAL – Argentina Dorada
Lee la tabla de medallas de cada multideportivo (Wikipedia u oficial) y se queda con la fila de Argentina.
Guarda data/medalleros.json. El panel lo muestra en "Solo medallas" y avisa si no coincide con el Doc.
Sin IA, cero tokens. Corre cada hora junto al lector del Doc.

Para probarlo:  python -m bots.medallero.main
"""
import json
import re

from bs4 import BeautifulSoup

from bots.comun import guardar
from bots.comun.red import bajar

PAISES = ("argentina", "arg")


def numeros(celdas):
    out = []
    for c in celdas:
        t = re.sub(r"\[.*?\]", "", c.get_text(" ", strip=True)).replace(",", "").strip()
        if re.fullmatch(r"\d{1,4}", t):
            out.append(int(t))
    return out


def fila_argentina(html):
    """Busca en las tablas de medallas la fila de Argentina. Devuelve (oro, plata, bronce, total) o None."""
    sopa = BeautifulSoup(html, "html.parser")
    for tabla in sopa.find_all("table"):
        encabezado = tabla.get_text(" ", strip=True).lower()[:400]
        if not any(p in encabezado for p in ("gold", "oro", "medal", "medall")):
            continue
        for tr in tabla.find_all("tr"):
            celdas = tr.find_all(["td", "th"])
            texto = " ".join(c.get_text(" ", strip=True).lower() for c in celdas[:3])
            if not any(re.search(rf"\b{p}\b", texto) for p in PAISES):
                continue
            n = numeros(celdas)
            # la fila suele ser: puesto, país, oro, plata, bronce, total (el puesto puede faltar)
            for i in range(len(n) - 3):
                o, p, b, t = n[i:i + 4]
                if o + p + b == t:
                    return o, p, b, t
    return None


def main():
    cfg = json.loads((guardar.RAIZ / "config" / "multideportivos.json").read_text(encoding="utf-8"))
    ruta = guardar.DATA / "medalleros.json"
    datos = guardar.leer(ruta, {})
    for m in cfg.get("medalleros", []):
        for url in m["urls"]:
            html = bajar(url, intentos=2)
            if not html:
                continue
            fila = fila_argentina(html)
            if fila:
                o, p, b, t = fila
                nuevo = {"oro": o, "plata": p, "bronce": b, "total": t, "fuente": url}
                viejo = datos.get(m["evento"], {})
                # la hora solo cambia si cambió el medallero (así no se publica el panel cada hora por nada)
                nuevo["actualizado"] = viejo.get("actualizado") if {k: viejo.get(k) for k in nuevo} == nuevo else \
                    guardar.ahora().isoformat(timespec="minutes")
                datos[m["evento"]] = nuevo
                print(f"✅ {m['evento']}: 🥇{o} 🥈{p} 🥉{b} = {t}  ({url})")
                break
        else:
            print(f"·  {m['evento']}: todavía no hay medallero con Argentina")
    guardar.escribir(ruta, datos)


if __name__ == "__main__":
    main()
