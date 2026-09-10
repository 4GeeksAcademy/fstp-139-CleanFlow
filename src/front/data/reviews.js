/**
 * VALORACIÓN MEDIA DE CLIENTES.
 *
 * ⚠️ DATO PROVISIONAL. Está escrito a mano porque la tabla de reseñas
 * todavía no existe.
 *
 * CUANDO EXISTA:
 * 1. Se crea services/reviewService.js con getReviewsSummary(), igual
 *    que serviceService.js.
 * 2. Se guarda en el store y el hero lee de ahí.
 * 3. Se borra este archivo.
 *
 * Nadie escribe el 4,8 dentro de un componente: si el número vive aquí,
 * cambiarlo es tocar una línea y no buscarlo por medio proyecto.
 */

export const REVIEWS_SUMMARY = {
    average: 4.8,   // de 0 a 5
    total: 128,     // opiniones contadas
}
