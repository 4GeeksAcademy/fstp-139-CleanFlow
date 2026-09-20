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
  const result = await apiRequest("/api/bookings", { method: "POST", token, body: bookingData });

  return result.ok ? { ...result, data: result.data.booking } : result;
};
