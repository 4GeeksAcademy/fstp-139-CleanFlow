/**
 * DISPONIBILIDAD PARA RESERVAR (#69) · llamadas a la API.
 *
 * Devuelven { ok, status, data } y nunca lanzan errores.
 *  - ok:    `data` ya es la lista o el calendario.
 *  - error: el mensaje está en data.message.
 *
 * Solo para clientes: el backend responde 403 a los demás roles. Las usa
 * el panel de contratación (#14) y el diálogo de cambiar la fecha (#17).
 */

import { apiRequest } from "./apiClient";

/** Trabajadores a los que se puede reservar. "Cualquiera" lo añade el panel. */
export const getBookableWorkers = async (token) => {
  const result = await apiRequest("/api/availability/workers", { token });

  return result.ok
    ? { ...result, data: Array.isArray(result.data.workers) ? result.data.workers : [] }
    : result;
};

/**
 * Huecos de un mes para una reserva de `hours` horas.
 *
 * month: "2026-10" · worker: "any" o el id de un trabajador.
 * data: { "2026-10-05": [{ start: "09:00", options: [{ worker_id, days }] }] },
 * solo con los días que tienen algún hueco.
 *
 * excludeBooking: al cambiar la fecha de una reserva, la suya propia.
 * Sus tramos cuentan como libres, o no podría moverse ni dos horas
 * dentro de su mismo día (#17).
 */
export const getAvailability = async (
  { hours, month, worker = "any", excludeBooking },
  token,
) => {
  const query = new URLSearchParams({ hours, month, worker });

  // Solo si lo hay: el backend distingue que no venga de que venga vacío.
  if (excludeBooking) {
    query.set("exclude_booking", excludeBooking);
  }

  const result = await apiRequest(`/api/availability?${query}`, { token });

  return result.ok ? { ...result, data: result.data.days || {} } : result;
};
