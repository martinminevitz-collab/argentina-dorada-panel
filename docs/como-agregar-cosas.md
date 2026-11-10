# Cómo agregar cosas

Todo se edita desde github.com: abrís el archivo, tocás el lápiz ✏️, cambiás y apretás **Commit changes**.
Ojo con las comas y las comillas: si falta una, el bot falla en la próxima vuelta (vas a ver una ✗ roja en *Actions*).

## Un deporte nuevo → `config/deportes.json`
Copiá una línea y cambiá los datos:
```json
{"nombre": "Canotaje slalom", "buscar": "canotaje slalom", "activo": true},
```
- `buscar`: palabras para Google Noticias. Se puede usar `OR`: `"Leonas OR Leones hockey"`.
- Para apagarlo sin borrarlo: `"activo": false`.

## Una web nueva → `config/fuentes.json`
```json
{"nombre": "Federación X", "tipo": "web", "url": "https://...", "filtrar_argentina": true, "activo": true},
```
- `tipo`: `"rss"` si la web tiene feed de noticias (suele ser la dirección + `/feed/`); si no, `"web"`.
- `filtrar_argentina`: `false` si la web es 100% argentina (una federación), `true` si es internacional.

## Que detecte mejor → `config/filtros.json`
- Se colaron cosas que no sirven → agregá una palabra a `excluir_si_aparece`.
- Algo que es resultado aparece como "Otro" → sumá la palabra a `palabras_resultado`.
- Un lugar de Buenos Aires que no reconoce → sumalo a `lugares_buenos_aires`.

## Un bot nuevo
1. Carpeta nueva en `bots/` (ej: `bots/eventos/`) con su `main.py`.
2. Usa las piezas de `bots/comun/` para guardar en `data/`.
3. Un archivo nuevo en `.github/workflows/` con su horario (copiar `bot-resultados.yml`).

## Afinar un deporte desde la planilla (lo más fácil)
En la "Lista de deportes para Claude" se pueden agregar dos columnas (con ese título exacto en la fila de DEPORTES):
- **BUSCAR**: qué buscar en Google Noticias para ese deporte. Ej. Tenis → `Copa Davis OR Billie Jean King OR tenis juvenil`. Si está vacía, usa `config/deportes.json` o el nombre del deporte.
- **EXCLUIR**: palabras que descartan la noticia en ese deporte, separadas por coma.
  Con **SALVO** se ponen excepciones (separadas por `/`): la noticia se descarta, menos si también dice alguna de esas palabras.
  - Tenis → `ATP SALVO campeón / título / final, WTA SALVO campeón / título / final`
  - Deporte donde no importan los nacionales → `campeonato argentino SALVO récord, nacional SALVO récord`
  - Alcanza con escribir el comienzo: `campeón` también encuentra campeona y campeones.
El bot lo toma en la vuelta siguiente.
