# Panel Argentina Dorada

Panel propio de Argentina Dorada con bots que trabajan solos, gratis y sin usar IA.

- **Panel:** se abre desde el navegador (compu o celular) y se puede instalar como app.
- **Bots:** corren solos en GitHub cada 3 horas, aunque nadie tenga nada abierto.
- **Costo:** $0. Tokens de IA: 0.

## Cómo está ordenado

```
argentina-dorada-panel/
├── config/              ← LO QUE SE PUEDE EDITAR SIN SABER PROGRAMAR
│   ├── deportes.json      deportes que busca el bot y con qué palabras
│   ├── fuentes.json       webs fijas que revisa (ENARD, COA, Totallympics…)
│   └── filtros.json       palabras para detectar argentinos, resultados, agenda, Bs. As.
│
├── data/                ← LO QUE GUARDAN LOS BOTS (no tocar a mano)
│   ├── hallazgos/AAAA/MM/AAAA-MM-DD.json   todo lo encontrado ese día
│   ├── indice.json                          lista de días (la usa el panel)
│   ├── ultima-corrida.json                  resumen de la última vuelta de cada bot
│   └── vistos.json                          memoria para no repetir noticias (60 días)
│
├── bots/                ← EL CÓDIGO DE LOS BOTS
│   ├── comun/             piezas que comparten todos los bots
│   └── resultados/        bot de resultados (un bot nuevo = una carpeta nueva acá)
│
├── panel/               ← LA PÁGINA/APP
│
├── docs/                ← EXPLICACIONES
│   ├── como-agregar-cosas.md
│   └── para-el-agente-claude.md
│
└── .github/workflows/   ← LOS HORARIOS (cuándo corre cada bot)
```

## Cosas útiles

- **Correr el bot ya, sin esperar:** pestaña *Actions* → *Bot de resultados* → *Run workflow*.
- **Ver si falló:** pestaña *Actions*. Una ✗ roja = algo salió mal (GitHub también te avisa por mail).
- **Agregar un deporte o una web:** ver `docs/como-agregar-cosas.md`.
