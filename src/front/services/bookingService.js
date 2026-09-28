/**
 * RESERVAS DEL CLIENTE (#14) · llamadas a la API.
 *
 * Devuelven { ok, status, data } y nunca lanzan errores.
 *  - ok:    `data` ya es la reserva.
 *  - error: el mensaje está en data.message.
 *
 * El precio lo calcula el backend: lo que envíe el panel ni se lee.
 */

import { apiRequest } from "./apiClient";

/**
 * Crea una reserva, que nace confirmada.
 *
 * bookingData: { service_slug, task_ids, hours, worker, start, address_id, notes }
 *  - task_ids: con repeticiones (tres habitaciones = tres veces el mismo id).
 *  - worker:   "any" (Cualquiera) o el id, como número.
 *  - start:    "2026-10-05T09:00", hora de Madrid y sin zona.
 *
 * data: la reserva, con su trabajador, sus tramos y sus tareas.
 * Un 409 significa que el hueco acaba de ocuparse: hay que recargarlos.
 */
export const createBooking = async (bookingData, token) => {
  const result = await apiRequest("/api/bookings", {
    method: "POST",
    token,
    body: bookingData,
  });

  return result.ok ? { ...result, data: result.data.booking } : result;
};

export const getWorkerBookings = (token) =>
  apiRequest("/api/bookings", { token });

export const completeBookingTask = (taskId, token, completed = true) =>
  apiRequest(`/api/booking-tasks/${taskId}`, {
    method: "PATCH",
    token,
    body: {
      status: completed ? "completed" : "pending",
    },
  });

export const completeBooking = (bookingId, token) =>
  apiRequest(`/api/bookings/${bookingId}/complete`, {
    method: "PATCH",
    token,
  });

export const getMyBookings = (token) =>
    apiRequest("/api/bookings", { token });

// ----------------------------------------------------------------------
// EL DÍA DE TRABAJO Y SUS FOTOS (#82)
// ----------------------------------------------------------------------
// Las cuatro devuelven la reserva entera o la foto, para que la pantalla
// se repinte con la respuesta sin tener que volver a pedirla.

/** Marca la llegada. El primer día pone la reserva en curso. */
export const startBookingDay = (bookingId, dayId, token) =>
  apiRequest(`/api/bookings/${bookingId}/days/${dayId}/start`, {
    method: "POST",
    token,
  });

/** Cierra el día. El servicio se finaliza aparte, con completeBooking. */
export const finishBookingDay = (bookingId, dayId, token) =>
  apiRequest(`/api/bookings/${bookingId}/days/${dayId}/finish`, {
    method: "POST",
    token,
  });

/**
 * Sube el antes o el después de una tarea.
 *
 * kind: "before" o "after" · file: el archivo del input de la cámara.
 *
 * Va en un FormData y no en JSON: es un archivo. apiRequest lo detecta y
 * deja que el navegador ponga el Content-Type con su separador.
 */
export const uploadTaskPhoto = (taskId, kind, file, token) => {
  const body = new FormData();

  body.append("kind", kind);
  body.append("photo", file);

  return apiRequest(`/api/booking-tasks/${taskId}/photos`, {
    method: "POST",
    token,
    body,
  });
};

/** Borra una foto mal hecha, mientras la tarea siga abierta. */
export const deleteTaskPhoto = (mediaId, token) =>
  apiRequest(`/api/media/${mediaId}`, {
    method: "DELETE",
    token,
  });

// ----------------------------------------------------------------------
// LA RESPUESTA DEL CLIENTE (#83)
// ----------------------------------------------------------------------
// Las dos devuelven la reserva entera, con su confirmation ya calculada,
// para que la pantalla se repinte sin volver a pedirla.

/** El cliente da el servicio por bueno. */
export const confirmBooking = (bookingId, token) =>
  apiRequest(`/api/bookings/${bookingId}/confirm`, {
    method: "POST",
    token,
  });

/**
 * El cliente dice que algo no fue bien.
 *
 * data: { description, photos } · photos: hasta cinco File.
 *
 * Las fotos van todas en el mismo campo "photo": el backend las lee con
 * getlist(), así que repetir el nombre es justo lo que espera.
 */
export const claimBooking = (bookingId, { description, photos = [] }, token) => {
  const body = new FormData();

  body.append("description", description);
  photos.forEach((photo) => body.append("photo", photo));

  return apiRequest(`/api/bookings/${bookingId}/claim`, {
    method: "POST",
    token,
    body,
  });
};

// Fechas de Madrid sin convertirlas al huso horario del navegador.
export const formatInterval = (day) => {
    const date = day.starts_at.slice(0, 10).split("-").reverse().join("/");
    return `${date} · ${day.starts_at.slice(11, 16)}–${day.ends_at.slice(11, 16)}`;
};

// ----------------------------------------------------------------------
// CANCELAR Y CAMBIAR LA FECHA (#17)
// ----------------------------------------------------------------------
// Las dos salidas de una reserva que aún no ha empezado. El cliente
// hasta 24 h antes, el encargado siempre.

/** Cancela la reserva. El motivo es opcional para el cliente. */
export const cancelBooking = (bookingId, token, reason = "") =>
  apiRequest(`/api/bookings/${bookingId}/cancel`, {
    method: "PATCH",
    token,
    body: { reason },
  });


/**
 * Mueve la reserva a otro día y hora.
 *
 * data: { startsAt, workerId } · startsAt: "2026-10-07T09:00", hora de
 * Madrid y sin zona, tal como la da el calendario.
 *
 * workerId es opcional: sin él se reparte como al contratar, con quien
 * menos horas tenga ese día. La respuesta trae quién irá al final, que
 * puede no ser el de antes.
 *
 * Un 409 significa que el hueco acaba de ocuparse: hay que recargarlos.
 */
export const rescheduleBooking = (bookingId, { startsAt, workerId }, token) =>
  apiRequest(`/api/bookings/${bookingId}/reschedule`, {
    method: "PATCH",
    token,
    body: workerId ? { starts_at: startsAt, worker_id: workerId } : { starts_at: startsAt },
  });
