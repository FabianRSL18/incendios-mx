# 🔥 Sistema de Monitoreo de Incendios en México

Este proyecto permite visualizar, reportar y analizar incendios forestales en México utilizando noticias web (scraping), reportes ciudadanos geolocalizados y análisis estadístico con R. El sistema incluye una API REST con Node.js, almacenamiento en MongoDB, visualización en mapa con Leaflet, y gráficas con Chart.js.

---

## 📦 Tecnologías Utilizadas

* Node.js + Express (API y backend)
* MongoDB + Mongoose (almacenamiento de noticias y reportes)
* Leaflet.js (mapa interactivo)
* Chart.js (gráficas de estadísticas)
* R (análisis estadístico)
* Puppeteer / Axios (scraping de noticias)
* Multer (subida de imágenes)
* Nominatim (reverse geocoding de coordenadas)

---

## 🧩 Estructura del Proyecto

```
├── R/                             # Scripts de análisis estadístico
├── db/                           # Modelos de MongoDB
├── public/                       # Archivos públicos (HTML, CSS, JS, imágenes)
│   ├── data/                     # Archivos JSON (GeoJSON y estadísticas)
│   └── uploads/                  # Imágenes subidas por usuarios
├── scraper/                      # Scrapers por fuente y lógica de ubicación
├── server.js                    # Servidor principal con API REST
├── analizar.js                  # Proceso central de scraping + enriquecimiento
└── package.json                 # Dependencias del proyecto
```

---

## 🚀 Instalación y Configuración

1. Clona el repositorio:

```bash
git clone https://github.com/usuario/incendios-mx.git
cd incendios-mx
```

2. Instala las dependencias:

```bash
npm install
```

3. Asegúrate de tener MongoDB corriendo en localhost:

```bash
mongod --dbpath /tu/ruta/a/mongodb/data
```

4. Instala R y los paquetes necesarios:

En consola de R:

```R
install.packages(c("jsonlite", "dplyr", "mongolite"))
```

5. Ejecuta el servidor:

```bash
node server.js
```

---

## 🌐 Endpoints Principales

* GET /api/incendios → Obtener noticias desde GNews y Google (scraper en vivo)
* GET /api/ranking-estados → Ranking de incendios por estado
* GET /api/noticias-por-estado/\:estado → Noticias filtradas por estado
* GET /api/estadisticas → Estadísticas preprocesadas (usadas por Chart.js)
* POST /api/reportar → Reporte ciudadano (coordenadas + imagen + descripción)
* PATCH /api/reportes/\:id/moderar → Cambiar estado de moderación

---

## 🗺️ Interfaz Web

Abre en tu navegador:

* [http://localhost:3000/mapa.html](http://localhost:3000/mapa.html) → Mapa con calor y reportes
* [http://localhost:3000/reportar.html](http://localhost:3000/reportar.html) → Formulario para reportar incendio
* [http://localhost:3000/noticias.html](http://localhost:3000/noticias.html) → Noticias recopiladas
* [http://localhost:3000/moderacion.html](http://localhost:3000/moderacion.html) → Panel de revisión de reportes
* [http://localhost:3000/estadisticas.html](http://localhost:3000/estadisticas.html) → Gráficas de incendios

---

## 🔁 Actualización automática

* El sistema ejecuta scraping, análisis y actualización de estadísticas cada 5 minutos.

---

## 🛡️ Seguridad y buenas prácticas

* No subas tu API KEY real a repositorios públicos
* Asegura el acceso a las rutas de moderación si está en producción
* Considera almacenar imágenes en un CDN en despliegues grandes

---

## 📄 Licencia

Este proyecto es de uso académico y demostrativo. Puedes reutilizarlo citando al autor original.

---

