# Para el agente de Claude (vueltas de 10:52 y 22:52)

Los bots ya hicieron la búsqueda pesada. El agente NO tiene que volver a revisar Google Noticias,
ENARD, COA, Totallympics ni AllSportDB por su cuenta: eso está en `data/`.

## Qué leer
1. `data/indice.json` → archivos de los últimos días.
2. Los archivos de hoy y ayer (`data/hallazgos/AAAA/MM/AAAA-MM-DD.json`).
3. Quedarse con los que tienen `encontrado` posterior a la vuelta anterior del agente
   (mañana: desde las 22:52 del día anterior; noche: desde las 10:52).

Cada hallazgo trae: `titulo`, `resumen`, `link`, `fuente`, `deporte`,
`tipo` (resultado / agenda / otro), `en_buenos_aires`, `publicado`, `encontrado`.

## Qué hacer con eso
- Abrir el link de los que sirven, confirmar el dato y pasarlo al Doc "Resultados desde Claude" con el formato de siempre.
- Lo que tenga `en_buenos_aires: true` y sea de nivel nacional o superior → también a la planilla "Eventos desde Claude".
- Seguir aplicando el filtro de "YA PUBLICADOS".
- Los bots se equivocan (no son IA): si algo no es argentino o no es deporte de selección, se descarta.

## Qué sigue buscando el agente por su cuenta (lo que los bots no ven)
- Instagram de deportistas y federaciones (vía Google).
- Torneos chicos o raros que no salen en noticias.
- Seguimiento de los eventos del Doc que están en curso o "Necesito más info".
