/**
 * DISPONIBILIDAD PARA RESERVAR (#69) · llamadas a la API.
 *
 * Devuelven { ok, status, data } y nunca lanzan errores.
 *  - ok:    `data` ya es la lista o el calendario.
 *  - error: el mensaje está en data.message.
 *
 * Solo para clientes: el backend responde 403 a los demás roles.
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
 */
export const getAvailability = async ({ hours, month, worker = "any" }, token) => {
  const query = new URLSearchParams({ hours, month, worker });
  const result = await apiRequest(`/api/availability?${query}`, { token });

  return result.ok ? { ...result, data: result.data.days || {} } : result;
};