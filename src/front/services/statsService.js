/**
 * LLAMADAS DEL INICIO DEL ENCARGADO (#24).
 *
 * Tres, y van separadas porque se piden en momentos distintos: las
 * métricas una vez al entrar, el día cada minuto y cada vez que se
 * cambia de fecha, y el detalle solo al abrir un servicio.
 */

import { apiRequest } from "./apiClient";

/** Las cifras del negocio y las cuatro bandejas. */
export const getStats = (token) => apiRequest("/api/stats", { token });

/**
 * Los servicios de un día. Sin fecha, hoy.
 *
 * date llega como "2026-09-30": el backend la espera así y la interpreta
 * en hora de Madrid.
 */
export const getDayBookings = (date, token) => apiRequest(
    `/api/manage/bookings${date ? `?date=${date}` : ""}`, { token }
);

/**
 * El detalle de una reserva, con sus tramos, tareas, fotos e
 * incidencias. Se pide solo al abrir una: en el listado del día no hace
 * falta y multiplicaría el peso de la respuesta por diez.
 */
export const getManagedBooking = (bookingId, token) => apiRequest(
    `/api/manage/bookings/${bookingId}`, { token }
);
