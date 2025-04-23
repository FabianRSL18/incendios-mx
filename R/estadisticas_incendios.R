library(mongolite)
library(dplyr)
library(jsonlite)

# Conexión a MongoDB local
conexion <- mongo(collection = "noticias", db = "incendios", url = "mongodb://localhost")

# Extraer todos los documentos
noticias <- conexion$find()

# Verifica que haya campo 'estado'
if (!"estado" %in% colnames(noticias)) {
    stop("El campo 'estado' no existe en los datos.")
}

# Normalización de nombres de estado
noticias <- noticias %>%
mutate(estado = case_when(
    is.na(estado) ~ NA_character_,
    estado == "Veracruz de Ignacio de la Llave" ~ "Veracruz",
    estado == "Ciudad de México" ~ "CDMX",
    estado == "México" ~ "Estado de México",
    TRUE ~ estado
))

# Procesar: contar cantidad de noticias por estado
estadisticas <- noticias %>%
    group_by(estado) %>%
    summarise(cantidad = n()) %>%
    arrange(desc(cantidad))

# Convertir al formato que usa Chart.js
resultado <- list(
    labels = estadisticas$estado,
    values = estadisticas$cantidad
)

# Guardar JSON para el frontend
write_json(resultado, "public/data/estadisticas.json", pretty = TRUE, auto_unbox = TRUE)

cat("Estadísticas generadas correctamente\n")
