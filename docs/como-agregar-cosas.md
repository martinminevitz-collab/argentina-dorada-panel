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
