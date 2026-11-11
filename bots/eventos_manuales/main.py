"""EVENTOS CARGADOS A MANO – Argentina Dorada
Los compañeros cargan eventos desde el panel ("+ Crear evento"); quedan en la base compartida (Supabase).
Este bot los baja y guarda data/eventos-manuales.json con los que todavía NO están en el Doc.
El agente de Claude lee ese archivo, los pasa al Doc (con una línea "Ref panel: xxxxxxxx") y los sigue.
Sin IA, cero tokens. Corre cada hora junto al lector del Doc.

Usa la clave publishable (la misma del panel) y una función de la base que solo devuelve los eventos,
sin los mails de quién los cargó.

Para probarlo:  python -m bots.eventos_manuales.main
"""
import json
import re
import urllib.request

from bots.comun import guardar

REF = 8  # cuántas letras del id usa el agente como referencia


def config_base():
    js = (guardar.RAIZ / "panel" / "config.js").read_text(encoding="utf-8")
    url = re.search(r'supabaseUrl:\s*"([^"]+)"', js).group(1)
    clave = re.search(r'supabaseKey:\s*"([^"]+)"', js).group(1)
    return url, clave


def bajar_eventos(funcion="eventos_manuales_para_bot"):
    url, clave = config_base()
    pedido = urllib.request.Request(
        f"{url}/rest/v1/rpc/{funcion}", data=b"{}", method="POST",
        headers={"apikey": clave, "Authorization": f"Bearer {clave}", "Content-Type": "application/json"})
    with urllib.request.urlopen(pedido, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    try:
        eventos = bajar_eventos()
    except Exception as e:  # base dormida, función todavía no creada, etc.
        print(f"⚠️  No se pudieron leer los eventos cargados a mano: {e}")
        return
    doc = guardar.leer(guardar.DATA / "doc-resultados.json", {})
    refs = {r for ev in doc.get("eventos", []) for r in ev.get("refs_panel", [])}
    pendientes = []
    for ev in eventos:
        ref = ev["id"].replace("-", "")[:REF]
        if ref in refs:
            continue
        pendientes.append({"ref": ref, **{k: ev.get(k) for k in
                           ("seccion", "estado", "deporte", "titulo", "fechas", "lugar", "detalle", "link", "creado_en")}})
    ruta = guardar.DATA / "eventos-manuales.json"
    nuevo = {"_nota": "Eventos cargados a mano en el panel que todavía no están en el Doc. El agente los pasa al Doc "
                      "y al final del bloque escribe la línea 'Ref panel: <ref>'.",
             "pendientes": pendientes}
    if guardar.leer(ruta, {}).get("pendientes") != pendientes:
        guardar.escribir(ruta, nuevo)
    print(f"✅ Cargados a mano: {len(eventos)} en la base, {len(pendientes)} pendientes de pasar al Doc")
    agregados(refs)


def agregados(refs):
    """Datos agregados a un evento desde el panel ("+ Agregar dato") -> data/agregados.json."""
    try:
        filas = bajar_eventos("agregados_para_bot")
    except Exception as e:
        print(f"⚠️  No se pudieron leer los datos agregados: {e}")
        return
    pendientes = []
    for f in filas:
        ref = f["id"].replace("-", "")[:REF]
        if ref in refs:
            continue
        pendientes.append({"ref": ref, **{k: f.get(k) for k in ("evento_id", "evento_titulo", "tipo", "texto", "creado_en")}})
    ruta = guardar.DATA / "agregados.json"
    nuevo = {"_nota": "Datos que los compañeros agregaron a un evento desde el panel y que todavía no están en el Doc. "
                      "El agente los suma al bloque de ese evento y al final escribe 'Ref panel: <ref>'.",
             "pendientes": pendientes}
    if guardar.leer(ruta, {}).get("pendientes") != pendientes:
        guardar.escribir(ruta, nuevo)
    print(f"✅ Datos agregados: {len(filas)} en la base, {len(pendientes)} pendientes de pasar al Doc")


if __name__ == "__main__":
    main()
