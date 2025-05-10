// Importa el framework Express para crear y manejar el servidor web
const express = require('express');
// Importa CORS para permitir solicitudes desde otros orígenes (útil para frontend y APIs)
const cors = require('cors');
// Importa exec para ejecutar scripts de línea de comandos, como scripts en R
const { exec } = require('child_process');
// Importa fs para operaciones con el sistema de archivos (leer y escribir archivos)
const fs = require('fs');
// Importa path para manejar rutas de archivos de forma compatible entre sistemas operativos
const path = require('path');
// Importa multer para procesar formularios con archivos (subida de imágenes)
const multer = require('multer');
// Importa fetch para hacer peticiones HTTP (por ejemplo, a la API de Nominatim)
const fetch = require('node-fetch');
// Importa función para obtener noticias desde fuentes externas (scrapers)
const { obtenerNoticias } = require('./scraper/scraper');
// Importa modelos y funciones relacionadas a la base de datos MongoDB
const { obtenerRankingPorEstado, Noticia, Reporte } = require('./db/db');

// Configura el almacenamiento de archivos subidos (imágenes) con multer
const storage = multer.diskStorage({
    // Carpeta de destino para guardar archivos
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    // Nombre del archivo: timestamp + nombre original
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage }); // Instancia de multer con la configuración definida

// Crea la aplicación de Express
const app = express();
// Define el puerto en el que correrá el servidor
const PORT = 3000;

// Importa función que analiza y guarda noticias con ayuda de R
const { analizarNoticiasConR } = require('./analizar');

// Función principal que se encarga de ejecutar el scraping, guardar los datos
// y lanzar scripts en R para generar visualizaciones y estadísticas
async function actualizarTodo() {
    console.log('⏱ Iniciando análisis y actualización de datos...');

    try {
        // Ejecuta el proceso de análisis: obtiene noticias, las enriquece,
        // las guarda en MongoDB y genera el archivo noticias_estado.json
        await analizarNoticiasConR();
        console.log('✅ Noticias analizadas correctamente.');

        // Ejecuta script en R para generar el ranking por estado (datos para el mapa)
        exec('Rscript R/analisis_incendios.R noticias_estado.json', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error ejecutando analisis_incendios.R:', error.message);
            } else {
                console.log('📊 Ranking actualizado:\n', stdout); // Muestra el resultado del script en consola
            }
        });

        // Ejecuta script en R para generar estadísticas totales (usado en gráficas de Chart.js)
        exec('Rscript R/estadisticas_incendios.R', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error ejecutando estadisticas_incendios.R:', error.message);
            } else {
                console.log('📈 Estadísticas actualizadas correctamente.');
            }
        });

    } catch (err) {
        // Si ocurre algún error durante el proceso general (scraping o análisis), se muestra aquí
        console.error('❌ Error durante el proceso de actualización:', err);
    }
}

// Middleware
// Habilita CORS para permitir solicitudes desde otros dominios (por ejemplo, desde el frontend)
app.use(cors());
// Permite que el servidor pueda interpretar cuerpos de solicitud en formato JSON
app.use(express.json());
// Sirve archivos estáticos desde la carpeta 'public' (como imágenes, scripts JS, estilos, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint GET /api/incendios
// Este endpoint ejecuta los scrapers (GNews y Google) y devuelve las noticias directamente,
// sin guardarlas en la base de datos (útil para pruebas o visualización temporal)
app.get('/api/incendios', async (req, res) => {
    try {
        const data = await obtenerNoticias(); // Llama a la función scraper
        res.json(data); // Devuelve las noticias en formato JSON al cliente
    } catch (error) {
        console.error('❌ Error interno en /api/incendios:', error);
        res.status(500).json({ error: 'Error al obtener noticias' }); // En caso de error, responde con código 500
    }
});

// Endpoint GET /api/analisis-r
// Permite ejecutar manualmente el script de análisis en R que genera el ranking por estado
// Ideal para pruebas o para volver a generar el archivo sin depender del cron automático
app.get('/api/analisis-r', (req, res) => {
    // Ejecuta el script analisis_incendios.R usando la terminal
    exec('Rscript R/analisis_incendios.R', (error, stdout, stderr) => {
        if (error) {
            // Si ocurre un error al ejecutar el script, se registra y se devuelve un error al cliente
            console.error(`Error ejecutando R: ${error.message}`);
            return res.status(500).json({ error: 'Error al ejecutar R' });
        }
        // Si hay advertencias o información adicional en stderr, se muestra en consola
        if (stderr) console.error(`stderr: ${stderr}`);
        // Se devuelve el resultado del script (stdout) como respuesta JSON
        res.json({ resultado: stdout.trim() });
    });
});

// Endpoint GET /api/ranking-estados
// Devuelve un arreglo con el número de noticias por estado, utilizado para colorear el mapa de calor en mapa.html
app.get('/api/ranking-estados', async (req, res) => {
    try {
        // Llama a la función que hace un aggregate en MongoDB para contar noticias por estado
        const ranking = await obtenerRankingPorEstado();
        // Devuelve el resultado como JSON, por ejemplo:
        // [ { estado: "Veracruz", cantidad: 12 }, { estado: "Jalisco", cantidad: 9 }, ... ]
        res.json(ranking);
    } catch (error) {
        // En caso de error durante el procesamiento o consulta
        console.error('Error generando ranking:', error);
        res.status(500).json({ error: 'Error interno al generar ranking' });
    }
});

// Función para normalizar nombres de estados
// Sirve para convertir nombres abreviados o alternativos a su forma oficial
// Esto es útil para que el nombre buscado coincida con el que está guardado en la base de datos
const normalizarEstado = (nombre) => {
    // Diccionario con equivalencias entre formas abreviadas o comunes y su nombre oficial
    const mapaNombres = {
        "veracruz": "Veracruz De Ignacio De La Llave",  // Nombre oficial largo
        "cdmx": "CDMX",                                  // Acepta minúscula o variaciones
        "ciudad de méxico": "CDMX",
        "estado de méxico": "Estado de México"
        // Puedes agregar más equivalencias si lo deseas (ej. "michoacan": "Michoacán")
    };
    // Convierte el nombre recibido a minúsculas para hacer una comparación insensible a mayúsculas
    const clave = nombre.toLowerCase();
    // Devuelve el nombre normalizado si está en el diccionario, o el mismo nombre original si no se encuentra
    return mapaNombres[clave] || nombre;
};

// Endpoint GET /api/noticias-por-estado/:estado
// Devuelve todas las noticias almacenadas en MongoDB que correspondan al estado especificado
app.get('/api/noticias-por-estado/:estado', async (req, res) => {
    try {
        // Extrae el nombre del estado recibido en la URL
        const estadoRaw = req.params.estado;
        // Normaliza el nombre para que coincida con los valores en la base de datos
        const estado = normalizarEstado(estadoRaw);
        // Busca en la colección Noticia todas las entradas cuyo campo 'estado' coincida exactamente
        const noticias = await Noticia.find({ estado });
        // Devuelve las noticias encontradas en formato JSON
        res.json(noticias);
    } catch (error) {
        // En caso de error, se informa al servidor y se responde con error 500
        console.error('❌ Error en noticias-por-estado:', error);
        res.status(500).json({ error: 'Error obteniendo noticias' });
    }
});

// Endpoint GET /api/estadisticas-dinamicas
// Genera estadísticas en tiempo real combinando noticias y reportes ciudadanos revisados
// Devuelve un objeto con 'labels' (nombres de estados) y 'values' (cantidad de registros por estado)
app.get('/api/estadisticas-dinamicas', async (req, res) => {
    try {
        // Consulta todos los documentos de noticias y extrae solo el campo 'estado'
        const noticias = await Noticia.find({}, 'estado');
        // Consulta todos los reportes con estadoModeracion 'revisado' y extrae el campo 'estado'
        const reportes = await Reporte.find({ estadoModeracion: 'revisado' }, 'estado');
        // Se combinan ambos conjuntos de datos (noticias + reportes validados)
        const combinados = [...noticias, ...reportes];
        // Objeto para contar ocurrencias por estado
        const conteo = {};
        // Se recorre cada documento combinado
        combinados.forEach(doc => {
            // Se normaliza el nombre del estado a minúsculas
            const estado = (doc.estado || '').toLowerCase();
            // Si hay un estado definido, se incrementa el contador correspondiente
            if (estado) {
                conteo[estado] = (conteo[estado] || 0) + 1;
            }
        });
        // Se generan dos arreglos: uno con los nombres de los estados capitalizados
        const labels = Object.keys(conteo).map(e => e.charAt(0).toUpperCase() + e.slice(1));
        // Y otro con las cantidades correspondientes
        const values = Object.values(conteo);
        // Se responde con un objeto que puede ser usado por Chart.js u otras herramientas de visualización
        res.json({ labels, values });
    } catch (error) {
        // En caso de error durante el proceso
        console.error('❌ Error generando estadísticas dinámicas:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Endpoint GET /api/estadisticas
// Ejecuta el script R que genera estadísticas agrupadas por estado y luego devuelve el archivo JSON generado
// Este endpoint es útil para alimentar gráficas con datos preprocesados (por ejemplo, Chart.js)
app.get('/api/estadisticas', (req, res) => {
    // Ejecuta el script R que produce un archivo JSON con estadísticas por estado
    exec('Rscript R/estadisticas_incendios.R', (error, stdout, stderr) => {
        if (error) {
            // Si ocurre un error al ejecutar el script en R, se notifica al cliente
            console.error('Error ejecutando R:', error.message);
            return res.status(500).json({ error: 'Error al ejecutar R' });
        }
        // Ruta al archivo que el script R genera con los datos procesados
        const jsonPath = path.join(__dirname, 'public', 'data', 'estadisticas.json');
        // Se lee el contenido del archivo JSON generado por R
        fs.readFile(jsonPath, 'utf8', (err, data) => {
            if (err) {
                // Si no se puede leer el archivo, se responde con error
                console.error('Error leyendo estadísticas:', err.message);
                return res.status(500).json({ error: 'Error al leer estadísticas generadas' });
            }
            try {
                // Intenta parsear el contenido a objeto JSON y responderlo al cliente
                const json = JSON.parse(data);
                res.json(json);
            } catch (parseErr) {
                // Si el archivo existe pero está mal formado, se responde con error
                console.error('JSON mal formado:', parseErr.message);
                res.status(500).json({ error: 'El archivo JSON generado es inválido' });
            }
        });
    });
});

// Función para obtener estado y municipio a partir de coordenadas (latitud y longitud)
// Utiliza el servicio de geocodificación inversa de Nominatim (basado en OpenStreetMap)
async function obtenerUbicacion(lat, lng) {
    // URL para hacer la petición a Nominatim en formato JSON, con nivel de zoom que incluya división estatal/municipal
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    // Realiza la petición HTTP GET a Nominatim con un encabezado personalizado (User-Agent)
    const response = await fetch(url, {
        headers: { 'User-Agent': 'incendios-mx-reporter' } // Se recomienda especificar un User-Agent válido
    });
    // Convierte la respuesta en un objeto JSON
    const data = await response.json();
    // Extrae y devuelve el estado y el municipio si están disponibles
    return {
        estado: data.address?.state || null,                    // Campo 'state' (ej. "Jalisco")
        municipio: data.address?.county || data.address?.city || null  // Busca 'county', si no, 'city'
    };
}

// Endpoint POST /api/reportar
// Recibe un reporte ciudadano con descripción, coordenadas y una imagen opcional
// Utiliza geocodificación inversa (Nominatim) para determinar el estado y municipio a partir de la ubicación
app.post('/api/reportar', upload.single('imagen'), async (req, res) => {
    try {
        // Extrae y convierte las coordenadas enviadas desde el formulario
        const lat = parseFloat(req.body.lat);
        const lng = parseFloat(req.body.lng);
        // Llama a la función que obtiene estado y municipio usando Nominatim
        const ubicacion = await obtenerUbicacion(lat, lng);
        // Crea un nuevo documento de reporte con los datos recibidos
        const nuevo = new Reporte({
            descripcion: req.body.descripcion,             // Texto ingresado por el usuario
            coordenadas: { lat, lng },                     // Coordenadas GPS
            imagen: req.file ? `/uploads/${req.file.filename}` : null, // Ruta de la imagen subida (si existe)
            estado: ubicacion.estado,                      // Estado detectado automáticamente
            municipio: ubicacion.municipio                 // Municipio detectado automáticamente
        });
        // Guarda el nuevo reporte en la base de datos MongoDB
        await nuevo.save();
        // Responde al cliente con un mensaje de éxito y el ID del nuevo reporte
        res.status(201).json({ mensaje: 'Reporte recibido con ubicación', id: nuevo._id });
    } catch (error) {
        // Si ocurre un error en el proceso, se informa y se devuelve un error 500
        console.error('❌ Error al guardar el reporte:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Endpoint PATCH /api/reportes/:id/moderar
// Permite actualizar el estado de moderación de un reporte ciudadano (ej. revisado, pendiente, falso)
app.patch('/api/reportes/:id/moderar', async (req, res) => {
    // Extrae el ID del reporte desde los parámetros de la URL
    const { id } = req.params;
    // Extrae el nuevo estado de moderación desde el cuerpo de la solicitud
    const { estadoModeracion } = req.body;
    // Valida que el nuevo estado sea uno de los valores permitidos
    if (!['pendiente', 'revisado', 'falso'].includes(estadoModeracion)) {
        return res.status(400).json({ error: 'Estado de moderación inválido' });
    }
    try {
        // Busca el reporte por ID y actualiza su campo estadoModeracion
        // { new: true } indica que se debe devolver el documento actualizado
        const resultado = await Reporte.findByIdAndUpdate(id, { estadoModeracion }, { new: true });
        // Si no se encontró el reporte, se responde con 404
        if (!resultado) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }
        // Si todo fue exitoso, se responde con el objeto actualizado
        res.json({ mensaje: 'Estado actualizado', reporte: resultado });
    } catch (error) {
        // Manejo de errores en caso de fallo de base de datos o lógica
        console.error('❌ Error al moderar reporte:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Endpoint GET /api/reportes
// Devuelve todos los reportes ciudadanos almacenados en la base de datos
app.get('/api/reportes', async (req, res) => {
    try {
        // Realiza una consulta para obtener todos los documentos de la colección 'reportes'
        const reportes = await Reporte.find();
        // Devuelve el arreglo completo de reportes en formato JSON
        res.json(reportes);
    } catch (error) {
        // En caso de error durante la consulta, se muestra en consola y se responde con código 500
        console.error('❌ Error al obtener reportes:', error);
        res.status(500).json({ error: 'Error al obtener reportes' });
    }
});

// Endpoint GET /api/reportes (optimizado para el mapa)
// Devuelve los 100 reportes ciudadanos más recientes ordenados por fecha descendente
app.get('/api/reportes', async (req, res) => {
    try {
        // Consulta los reportes y los ordena de más reciente a más antiguo
        // Se limita el resultado a 100 documentos para evitar sobrecargar el frontend
        const reportes = await Reporte.find()
            .sort({ fecha: -1 })  // Orden descendente por fecha
            .limit(100);          // Solo los 100 más recientes
        // Devuelve los reportes como arreglo JSON
        res.json(reportes);
    } catch (error) {
        // Manejo de errores en la consulta
        console.error('❌ Error obteniendo reportes:', error);
        res.status(500).json({ error: 'Error al obtener reportes' });
    }
});

// Endpoint PUT /api/moderar/:id
// Actualiza el estado de moderación de un reporte ciudadano según su ID
// Similar al PATCH anterior, pero no valida el valor ni devuelve el documento actualizado
app.put('/api/moderar/:id', async (req, res) => {
    try {
        // Extrae el ID del reporte desde los parámetros de la URL
        const { id } = req.params;
        // Extrae el nuevo estado de moderación desde el cuerpo de la solicitud
        const { estadoModeracion } = req.body;
        // Realiza la actualización del campo estadoModeracion sin validación previa
        await Reporte.findByIdAndUpdate(id, { estadoModeracion });
        // Devuelve un mensaje de éxito simple (no incluye el documento actualizado)
        res.json({ mensaje: 'Estado de moderación actualizado' });
    } catch (error) {
        // En caso de error, se muestra en consola y se responde con error 500
        console.error('❌ Error al actualizar reporte:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

actualizarTodo(); // Ejecutar todo al iniciar

setInterval(actualizarTodo, 5 * 60 * 1000); // Repetir cada 5 minutos

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});