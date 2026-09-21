/**
 * TURNOS (ENCARGADO) · llamadas a la API.
 *
 * Devuelven { ok, status, data } y nunca lanzan errores.
 *  - ok:    `data` ya es el turno o la lista.
 *  - error: el mensaje está en data.message.
 *
 * El token va siempre el último, como en taskService y serviceService.
 */

import { apiRequest } from "./apiClient";

// Todos los turnos, activos y desactivados, cada uno con sus trabajadores.
export const getShifts = async (token) => {
  const result = await apiRequest("/api/shifts", { token });
  if (!result.ok) return result;
  return { ...result, data: Array.isArray(result.data.shifts) ? result.data.shifts : [] };
};

export const createShift = async (shiftData, token) => {
  const result = await apiRequest("/api/shifts", { method: "POST", token, body: shiftData });
  return result.ok ? { ...result, data: result.data.shift } : result;
};

export const updateShift = async (shiftId, shiftData, token) => {
  const result = await apiRequest(`/api/shifts/${shiftId}`, { method: "PUT", token, body: shiftData });
  return result.ok ? { ...result, data: result.data.shift } : result;
};

export const toggleShiftStatus = async (shiftId, isActive, token) => {
  const result = await apiRequest(`/api/shifts/${shiftId}/status`, {
    method: "PATCH",
    token,
    body: { is_active: isActive },
  });
  return result.ok ? { ...result, data: result.data.shift } : result;
};

// Solo borra turnos sin trabajadores; si tiene alguno, la API da 409.
export const deleteShift = async (shiftId, token) => {
  return apiRequest(`/api/shifts/${shiftId}`, { method: "DELETE", token });
};
