# Cargar la librería jsonlite para leer y escribir archivos JSON
library(jsonlite)

# Obtener los argumentos pasados por línea de comandos
# Se espera que el primer argumento sea la ruta del archivo JSON a analizar
args <- commandArgs(trailingOnly = TRUE)
archivo <- args[1]

# Leer el archivo JSON y convertirlo a un dataframe
datos <- fromJSON(archivo)

# Filtrar registros que tengan definido el campo "estado" (no NA y no vacío)
datos_filtrados <- datos[!is.na(datos$estado) & datos$estado != "", ]

# Crear una tabla de frecuencia que cuenta cuántas noticias hay por estado
ranking_table <- as.data.frame(table(datos_filtrados$estado))

# Ordenar la tabla en orden descendente según la cantidad de noticias
ranking_ordenado <- ranking_table[order(-ranking_table$Freq), ]

# Renombrar las columnas a nombres más comprensibles
colnames(ranking_ordenado) <- c("estado", "cantidad")

# Imprimir el resultado en formato JSON, legible y sin listas anidadas
cat(toJSON(ranking_ordenado, pretty = TRUE, auto_unbox = TRUE))
