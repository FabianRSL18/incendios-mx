# 🔥 incendios-mx

Este proyecto permite visualizar, reportar y analizar incendios forestales en México utilizando noticias web (scraping), reportes ciudadanos geolocalizados y análisis estadístico con R. Incluye un sistema de autenticación, subida de imágenes, análisis automatizado y visualización web interactiva.

---

## 📦 Tecnologías Utilizadas

* Node.js + Express (API REST)
* MongoDB + Mongoose (almacenamiento de noticias y reportes)
* Passport.js (autenticación y roles de usuario)
* Multer (subida de imágenes)
* Leaflet.js (mapa interactivo)
* Chart.js (gráficas de estadísticas)
* R (análisis estadístico)
* Puppeteer / Axios (scraping de noticias)
* Nominatim API (geocodificación inversa)

---

## 🧩 Estructura del Proyecto

```
├── .idea/, .vscode/              # Configuración del entorno (VS Code / IDEs)
├── config/
│   └── passport.js               # Configuración de autenticación con Passport.js
├── db/
│   └── db.js                     # Conexión y modelos MongoDB
├── middleware/
│   └── auth.js                   # Middleware para proteger rutas (login, admin)
├── models/
│   └── User.js                   # Modelo de usuario para autenticación
├── routes/
│   └── auth.js                   # Rutas de login, logout y registro
├── scraper/
│   ├── gnews.js                  # Scraper para GNews
│   ├── googleapi.js              # Scraper para Google API
│   ├── scraper.js                # Lógica de scraping general
│   └── ubicacion.js              # Análisis de ubicación a partir del texto
├── R/
│   ├── analisis_incendios.R     # Script de análisis por estado
│   └── estadisticas_incendios.R # Generación de estadísticas
├── public/
│   ├── css/                      # Estilos separados por módulo/página
│   │   ├── estadisticas_style.css
│   │   ├── index_style.css
│   │   ├── mapa_style.css
│   │   ├── moderacion_style.css
│   │   ├── noticias_style.css
│   │   └── reportar_style.css
│   ├── data/
│   │   ├── estadisticas.json     # Datos generados por R
│   │   └── mexico.json           # GeoJSON de estados y municipios
│   ├── images/
│   │   └── logo.png              # Logo del sistema
│   ├── uploads/
│   │   └── avatars/              # Imágenes subidas por los usuarios
│   ├── login.html, register.html, mapa.html, etc.  # Interfaces de usuario
│   └── navbar.js                 # Navegación común
├── analizar.js                   # Coordinador del scraping y análisis R
├── server.js                     # Servidor principal y definición de API
├── package.json                  # Dependencias del proyecto
└── README.md                     # Documentación del sistema
```

---

## 🚀 Instalación y Configuración

1. Clona el repositorio:

```bash
git clone https://github.com/usuario/incendios-mx.git
cd incendios-mx
```

2. Instala las dependencias de Node.js:

```bash
npm install
```

3. Asegúrate de que MongoDB esté corriendo:

```bash
mongod --dbpath /ruta/a/tu/data
```

4. Instala R y los paquetes necesarios:

```R
install.packages(c("jsonlite", "dplyr", "mongolite"))
```

5. Ejecuta el servidor:

```bash
node server.js
```

---

## 🔐 Sistema de Autenticación

* Registro e inicio de sesión mediante correo y contraseña
* Almacenamiento seguro con sesiones y cookies
* Acceso protegido a rutas como `/reportar.html` o `/moderacion.html`
* Roles: `usuario` y `admin` (puede moderar reportes)
* Endpoint de autenticación: `/api/auth/status`

---

## 🌐 Endpoints Principales

* `GET /api/incendios` → Obtener noticias por scraping
* `GET /api/ranking-estados` → Ranking de estados con más incendios
* `GET /api/noticias-por-estado/:estado` → Filtrar noticias por estado
* `GET /api/estadisticas` → Estadísticas desde R
* `GET /api/estadisticas-dinamicas` → Estadísticas combinadas con reportes
* `POST /api/reportar` → Reporte ciudadano (requiere login)
* `PATCH /api/reportes/:id/moderar` → Modificar estado del reporte
* `GET /api/reportes` → Ver reportes (sólo revisados o todos si admin)

---

## 🗺️ Interfaz Web

* [http://localhost:3000/mapa.html](http://localhost:3000/mapa.html) → Mapa de incendios
* [http://localhost:3000/noticias.html](http://localhost:3000/noticias.html) → Noticias recopiladas
* [http://localhost:3000/estadisticas.html](http://localhost:3000/estadisticas.html) → Visualización estadística
* [http://localhost:3000/reportar.html](http://localhost:3000/reportar.html) → Enviar reporte (requiere login)
* [http://localhost:3000/moderacion.html](http://localhost:3000/moderacion.html) → Panel de revisión (admin)
* [http://localhost:3000/login](http://localhost:3000/login) → Login
* [http://localhost:3000/register](http://localhost:3000/register) → Registro

---

## 🔁 Actualización Automática

El servidor ejecuta cada 5 minutos:

* Scraping de noticias
* Análisis por estado (R)
* Estadísticas combinadas y visualización

---

## 🛡️ Seguridad y buenas prácticas

* No publiques tu API KEY o credenciales
* Protege el acceso a rutas `/moderacion.html` y endpoints críticos
* Usa HTTPS si publicas en producción
* Almacena imágenes en un servicio externo si el tráfico es alto

---

## 📄 Licencia

Este proyecto es de uso académico. Puedes modificarlo y reutilizarlo citando al autor original.
