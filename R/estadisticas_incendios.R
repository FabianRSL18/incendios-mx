# Librerías necesarias
library(mongolite)  # Para conectar y consultar colecciones de MongoDB
library(dplyr)      # Para manipulación y resumen de datos
library(jsonlite)   # Para leer y escribir archivos JSON

# Conexión a las colecciones 'noticias' y 'reportes' de la base de datos 'incendios'
conexion_noticias <- mongo(collection = "noticias", db = "incendios", url = "mongodb://localhost")
conexion_reportes <- mongo(collection = "reportes", db = "incendios", url = "mongodb://localhost")

# Obtener todos los documentos de la colección 'noticias'
noticias <- conexion_noticias$find()

# Obtener solo los reportes con estado no nulo y que ya hayan sido revisados
reportes <- conexion_reportes$find('{"estado": {"$ne": null}, "estadoModeracion": "revisado"}')

# Filtrar noticias que tengan campo 'estado' no vacío ni nulo
noticias <- noticias[!is.na(noticias$estado) & noticias$estado != "", ]
reportes <- reportes[!is.na(reportes$estado) & reportes$estado != "", ]

# Si hay reportes disponibles, se normalizan y se combinan con las noticias
if (nrow(reportes) > 0) {
    reportes$fuente <- "reporte"      # Se agrega una etiqueta de fuente
    reportes$keywords <- NULL         # Se eliminan campos no relevantes para estadísticas
    reportes$link <- NULL
    reportes$resumen <- NULL
    reportes$municipio <- NULL

    # Convertir fechas a texto para evitar problemas al unir ambos dataframes
    noticias$fecha <- as.character(noticias$fecha)
    reportes$fecha <- as.character(reportes$fecha)

    # Combinar ambos conjuntos de datos
    combinado <- bind_rows(noticias, reportes)
} else {
    combinado <- noticias  # Si no hay reportes, solo se usan las noticias
}

# Agrupar por estado y contar cuántos registros tiene cada uno
estadisticas <- combinado %>%
    group_by(estado) %>%
    summarise(cantidad = n()) %>%
    arrange(desc(cantidad))

# Preparar los datos para Chart.js en formato { labels: [...], values: [...] }
resultado <- list(
    labels = estadisticas$estado,
    values = estadisticas$cantidad
)

# Guardar el resultado en un archivo JSON en la carpeta pública
write_json(resultado, "public/data/estadisticas.json", pretty = TRUE, auto_unbox = TRUE)

# Mensaje de éxito
cat("📊 Estadísticas actualizadas con noticias + reportes revisados\n")