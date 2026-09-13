/**
 * LLAMADAS AL BACKEND PARA LAS OPINIONES PÚBLICAS.
 *
 * PROVISIONAL: mientras no exista el endpoint de valoraciones,
 * getPublicReviews devuelve opiniones de ejemplo.
 *
 * Cuando exista GET /api/reviews/public, cambiar USE_TEST_REVIEWS
 * a false. Las opiniones siempre procederán de CleanFlow, nunca
 * de Google ni de fuentes externas.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const USE_TEST_REVIEWS = true;

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
