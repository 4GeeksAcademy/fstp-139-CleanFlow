/**
 * INCIDENCIAS (#18) · llamadas a la API.
 *
 * Lo que sale mal en un servicio. Archivo propio y no dentro de
 * bookingService: las incidencias las van a usar también el encargado
 * para resolverlas (#19) y el cliente para reclamar (#83).
 *
 * Las dos devuelven la reserva entera, para que la pantalla se repinte
 * con la respuesta sin volver a pedirla.
 */

import { apiRequest } from "./apiClient";

/**
 * El cuerpo de las dos, como FormData: puede llevar foto.
 *
 * apiRequest lo detecta y deja que el navegador ponga el Content-Type
 * con su separador; escribirlo a mano rompería la subida.
 *
 * Los campos vacíos no se envían: el backend distingue "no me lo has
 * dicho" de "me lo has dicho vacío".
 */
const incidentBody = ({ incidentType, description, taskId, photo }) => {
    const body = new FormData();

    if (incidentType) body.append("incident_type", incidentType);
    if (taskId) body.append("booking_task_id", taskId);
    if (photo) body.append("photo", photo);

    body.append("description", description);

    return body;
};

/**
 * Abre una incidencia en un servicio.
 *
 * data: { incidentType: "client" | "company", description, taskId?, photo? }
 */
export const createIncident = (bookingId, data, token) =>
    apiRequest(`/api/bookings/${bookingId}/incidents`, {
        method: "POST",
        token,
        body: incidentBody(data),
    });

/**
 * Cierra el servicio como no realizado, con su incidencia.
 *
 * No se envía el tipo: siempre es de cliente y lo pone el backend.
 * data: { description, photo? }
 */
export const markNotDone = (bookingId, data, token) =>
    apiRequest(`/api/bookings/${bookingId}/not-done`, {
        method: "POST",
        token,
        body: incidentBody(data),
    });