/**
 * VALORACIONES · llamadas a la API.
 *
 * Tres cosas con el mismo origen: el cliente deja su nota (#20), la web
 * pública enseña la media y las últimas opiniones (#41), y el trabajador
 * consulta la suya (#75).
 *
 * Las opiniones son siempre de CleanFlow, nunca de Google ni de ninguna
 * fuente externa.
 */

import { apiRequest } from "./apiClient";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// El endpoint real ya existe, así que las de ejemplo quedan apagadas. Se
// conservan para poder enseñar la sección sin backend delante.
const USE_TEST_REVIEWS = false;

const TEST_REVIEWS = [
  {
    review_id: 1,
    client_name: "Cliente de ejemplo",
    rating: 5,
    comment: "El equipo fue puntual, cuidadoso y dejó todo impecable.",
  },
  {
    review_id: 2,
    client_name: "Cliente de ejemplo",
    rating: 4,
    comment: "Muy buena atención y un servicio profesional.",
  },
  {
    review_id: 3,
    client_name: "Cliente de ejemplo",
    rating: 5,
    comment: "El proceso de reserva fue sencillo y quedé muy satisfecha.",
  },
];

export const getPublicReviews = async () => {
  if (USE_TEST_REVIEWS) {
    return {
      ok: true,
      data: TEST_REVIEWS,
      provisional: true,
    };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/reviews/public`);

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, data };
    }

    return {
      ok: true,
      data: Array.isArray(data.reviews) ? data.reviews : [],
      provisional: false,
    };
  } catch (error) {
    console.error("Error al solicitar las opiniones públicas:", error);

    return {
      ok: false,
      networkError: true,
      data: [],
    };
  }
};


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
 * Sin sesión. Aparte de getPublicReviews porque esa devuelve solo la
 * lista y aquí hacen falta también los dos números, que son lo que
 * enseñan la landing (#41) y el panel del encargado (#24).
 */
export const getReviewsSummary = () => apiRequest("/api/reviews/public");

/** La nota del propio trabajador: { average, total }. Nunca quién la puso. */
export const getMyRating = (token) =>
  apiRequest("/api/workers/me/rating", { token });
