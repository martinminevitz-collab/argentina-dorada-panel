# Editar el panel en Visual Studio Code

1. Instalar **Git** (https://git-scm.com) y **Visual Studio Code** (https://code.visualstudio.com).
2. En VS Code: **Clonar repositorio** (Clone Git Repository) → pegar
   `https://github.com/martinminevitz-collab/argentina-dorada-panel` → elegir una carpeta → **Abrir**.
3. Instalar la extensión **Live Server** (de Ritwick Dey).
4. Abrir `panel/index.html` → clic derecho → **Open with Live Server**. Se abre en el navegador
   (`http://127.0.0.1:5500/panel/index.html`) y se recarga solo cada vez que guardás.
5. Para publicar: pestaña **Control de código fuente** (Source Control) → escribir qué cambiaste → **Commit** → **Sync / Push**.
   GitHub publica solo en ~1 minuto.

Antes de empezar a tocar, siempre **Sync / Pull** (bajar lo último): los bots guardan datos cada hora en el mismo repo.

Qué archivo es qué:
- `panel/estilos.css` → colores, tamaños, márgenes (las gráficas están al final, todo lo que empieza con `.g-`).
- `panel/graficas.js` → las plantillas de gráficas (qué campos tiene cada una y cómo se dibuja).
- `panel/app.js` → las pestañas, tarjetas y botones.
- `panel/index.html` → la estructura de la página. Si cambiás algo, subí el número `?v=` de los archivos y `ad-panel-vN` en `panel/sw.js` para que los celulares bajen la versión nueva.

En la compu el login con mail no anda (el link del mail te manda a la web publicada). Para diseño no hace falta: todo lo que se ve sin login funciona igual.
