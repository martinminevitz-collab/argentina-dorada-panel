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
    pendientes, multi = [], []
    for ev in eventos:
        ref = ev["id"].replace("-", "")[:REF]
        es_multi = str(ev.get("detalle") or "").startswith("[MULTIDEPORTIVO]")
        if es_multi:
            multi.append(ref)  # creado como multideportivo: el lector del Doc lo pone en su propia pestaña
        if ref in refs:
            continue
        fila = {"ref": ref, **{k: ev.get(k) for k in
                ("seccion", "estado", "deporte", "titulo", "fechas", "lugar", "detalle", "link", "creado_en")}}
        if es_multi:
            fila["detalle"] = re.sub(r"^\[MULTIDEPORTIVO\]\n?", "", fila["detalle"]) or None
            fila["multideportivo"] = True
        pendientes.append(fila)
    rm = guardar.DATA / "multi-refs.json"
    if guardar.leer(rm, {}).get("refs") != multi:
        guardar.escribir(rm, {"_nota": "Eventos creados en el panel como multideportivos (por su 'Ref panel'): van en su propia pestaña.", "refs": multi})
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
    pendientes, eliminados, noticias, clasif = [], [], [], []
    for f in filas:
        ref = f["id"].replace("-", "")[:REF]
        if str(f.get("texto") or "").startswith(("[CLASIFICADO]", "[QUITAR-CLASIFICADO]")):  # pestaña 🎯: no va al Doc
            clasif.append(f)
            continue
        if str(f.get("texto") or "").startswith("[NOTICIA]"):  # noticia cargada a mano en 📰 Noticias: es solo para el panel, no va al Doc
            noticias.append({k: f.get(k) for k in ("id", "evento_id", "evento_titulo", "tipo", "texto", "creado_en")})
            continue
        if f.get("tipo") == "eliminar" or str(f.get("texto") or "").startswith("[ELIMINAR]"):  # "🗑 Eliminar" del panel: va a la lista de vencidos y el agente saca el bloque del Doc
            eliminados.append(f.get("evento_titulo") or "")
            continue
        if ref in refs:
            continue
        pendientes.append({"ref": ref, **{k: f.get(k) for k in ("evento_id", "evento_titulo", "tipo", "texto", "creado_en")}})
    ruta = guardar.DATA / "agregados.json"
    nuevo = {"_nota": "Datos que los compañeros agregaron a un evento desde el panel y que todavía no están en el Doc. "
                      "El agente los suma al bloque de ese evento y al final escribe 'Ref panel: <ref>'. 'noticias' son noticias cargadas a mano: son solo para el panel, el agente no las toca.",
             "pendientes": pendientes, "noticias": noticias}
    viejo = guardar.leer(ruta, {})
    if viejo.get("pendientes") != pendientes or viejo.get("noticias", []) != noticias:
        guardar.escribir(ruta, nuevo)
    print(f"✅ Datos agregados: {len(filas)} en la base, {len(pendientes)} pendientes de pasar al Doc")
    guardar_clasificados(clasif)
    # vencidos.json lo arma el lector del Doc (corre antes); acá se le suman los eliminados desde el panel
    rv = guardar.DATA / "vencidos.json"
    v = guardar.leer(rv, {"vencidos": []})
    juntos = sorted(set(v.get("vencidos", [])) | {t for t in eliminados if t})
    if juntos != v.get("vencidos"):
        v["vencidos"] = juntos
        v["_nota"] = "Eventos terminados hace más de 5 días o eliminados desde el panel. El agente los saca del Doc y deja de seguirlos."
        guardar.escribir(rv, v)
    print(f"🗑  Eliminados desde el panel: {len(eliminados)}")


def guardar_clasificados(filas):
    """data/clasificados.json -> 'a_mano' y 'quitados'. La base borra los datos a los 30 días, así que acá se guardan para siempre
    (si alguien lo borra en el panel antes de los 30 días, se va también de acá)."""
    ruta = guardar.DATA / "clasificados.json"
    datos = guardar.leer(ruta, {})
    en_base = {f["id"] for f in filas}
    a_mano = {c["id"]: c for c in datos.get("a_mano", []) if c["id"] not in en_base and str(c.get("creado_en", "")) < _hace_29_dias()}
    quitados = set(datos.get("quitados", []))
    for f in filas:
        texto = str(f.get("texto") or "")
        if texto.startswith("[QUITAR-CLASIFICADO]"):
            quitados.add(texto.split("]", 1)[1].strip())
            continue
        try:
            d = json.loads(texto.split("]", 1)[1])
        except ValueError:
            continue
        a_mano[f["id"]] = {"id": f["id"], "juegos": d.get("juegos") or "Los Ángeles 2028", "quien": str(d.get("quien", ""))[:200],
                           "deporte": d.get("deporte", ""), "evento": d.get("evento", ""), "texto": str(d.get("texto", ""))[:400],
                           "plaza": str(d.get("plaza", ""))[:10], "link": str(d.get("link", ""))[:300],
                           "desde": str(f.get("creado_en", ""))[:10], "creado_en": f.get("creado_en")}
    nuevo = {**datos, "a_mano": sorted(a_mano.values(), key=lambda c: c["desde"]), "quitados": sorted(quitados)}
    if nuevo != datos:
        guardar.escribir(ruta, nuevo)
    print(f"🎯 Clasificados a mano: {len(a_mano)} · quitados: {len(quitados)}")


def _hace_29_dias():
    from datetime import datetime, timedelta, timezone
    return (datetime.now(timezone.utc) - timedelta(days=29)).isoformat()


if __name__ == "__main__":
    main()
