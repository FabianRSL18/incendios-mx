# analisis_incendios.R
library(jsonlite)

args <- commandArgs(trailingOnly = TRUE)
archivo <- args[1]

datos <- fromJSON(archivo)

# Filtrar solo los que tienen estado
datos_filtrados <- datos[!is.na(datos$estado) & datos$estado != "", ]

ranking_table <- as.data.frame(table(datos_filtrados$estado))
ranking_ordenado <- ranking_table[order(-ranking_table$Freq), ]
colnames(ranking_ordenado) <- c("estado", "cantidad")

cat(toJSON(ranking_ordenado, pretty = TRUE, auto_unbox = TRUE))

