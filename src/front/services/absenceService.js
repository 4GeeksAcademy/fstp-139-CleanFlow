import { apiRequest } from "./apiClient";

export const refreshAffected = () => window.dispatchEvent(new Event("cleanflow:affected-changed"));

export const getAbsences = (workerId, token) => apiRequest(`/api/workers/${workerId}/absences`, { token });
export const saveAbsence = (workerId, id, body, token) => apiRequest(
    `/api/workers/${workerId}/absences${id == null ? "" : `/${id}`}`,
    { token, method: id == null ? "POST" : "PUT", body }
);
export const removeAbsence = (workerId, id, token) => apiRequest(
    `/api/workers/${workerId}/absences/${id}`, { token, method: "DELETE" }
);
export const getAffected = (token, countOnly = false) => apiRequest(
    `/api/manage/bookings/affected${countOnly ? "?count_only=1" : ""}`, { token }
);
export const getReplacements = (id, token) => apiRequest(`/api/manage/bookings/${id}/replacements`, { token });
export const reassignBooking = (id, workerId, token) => apiRequest(
    `/api/manage/bookings/${id}/reassign`, { token, method: "POST", body: { worker_id: Number(workerId) } }
);
export const cancelCompany = (id, reason, token) => apiRequest(
    `/api/manage/bookings/${id}/cancel-company`, { token, method: "POST", body: { reason } }
);
export const getMyBookings = (token) => apiRequest("/api/my/bookings", { token });

// Fechas de Madrid sin zona: mostrar el valor recibido, no convertirlo al huso del navegador.
export const formatDay = (value) => value ? value.slice(0, 10).split("-").reverse().join("/") : "Sin fecha de fin";
export const formatInterval = (day) => `${formatDay(day.starts_at)} · ${day.starts_at.slice(11, 16)}–${day.ends_at.slice(11, 16)}`;

