"""Descargar páginas y feeds con reintentos. Si una web falla, no frena al resto."""
import time
import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ArgentinaDoradaBot/1.0; +https://github.com/martinminevitz-collab/argentina-dorada-panel)",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.6",
}


def bajar(url, intentos=3, espera=3, timeout=25):
    """Devuelve el texto de la URL o None si no se pudo (y anota el error)."""
    ultimo_error = None
    for i in range(intentos):
        try:
            r = requests.get(url, headers=HEADERS, timeout=timeout)
            if r.status_code == 200:
                r.encoding = r.encoding or "utf-8"
                return r.text
            ultimo_error = f"HTTP {r.status_code}"
            if r.status_code in (403, 404, 410):
                break  # no tiene sentido reintentar
        except requests.RequestException as e:
            ultimo_error = str(e)[:120]
        time.sleep(espera * (i + 1))
    print(f"  ⚠️  No se pudo bajar {url}: {ultimo_error}")
    return None
