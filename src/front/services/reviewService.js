/**
 * VALORACIONES · llamadas a la API.
 *
 * Tres cosas con el mismo origen: el cliente deja su nota (#20), la web
 * pública enseña la media y las últimas opiniones (#41), y el trabajador
 * consulta la suya (#75).
 *
 * Las opiniones son siempre de CleanFlow, nunca de Google ni de ninguna
 * fuente externa: son las mismas notas que deja el cliente al terminar
 * un servicio.
 */

import { apiRequest } from "./apiClient";

/**
 * El cliente valora un servicio. Multipart, porque puede llevar fotos.
 *
 * data: { rating, comment?, photos? } · photos es un array de File
 *
 * Devuelve la reserva entera, igual que confirmar y reclamar: así la
 * pantalla se repinta con la respuesta sin volver a pedirla.
 */
export const createReview = (bookingId, { rating, comment, photos = [] }, token) => {
  const body = new FormData();

  body.append("rating", rating);

  // El comentario vacío no se envía: el backend distingue "no me lo has
  // dicho" de "me lo has dicho vacío".
  if (comment) {
    body.append("comment", comment);
  }

  // Siempre "photo", repetido: es lo que lee request.files.getlist().
  photos.forEach((photo) => body.append("photo", photo));

  return apiRequest(`/api/bookings/${bookingId}/reviews`, {
    method: "POST",
    token,
    body,
  });
};

/**
 * La media de CleanFlow con sus últimas opiniones: { average, total, reviews }.
 *
 * Sin sesión: la llama cualquiera que entre en la landing. De cada
 * opinión vienen el nombre público, la foto del cliente si la tiene, el
 * servicio y la fecha. Nunca su id ni las fotos que subió al valorar.
 */
export const getReviewsSummary = () => apiRequest("/api/reviews/public");

/** La nota del propio trabajador: { average, total }. Nunca quién la puso. */
export const getMyRating = (token) =>
  apiRequest("/api/workers/me/rating", { token });
