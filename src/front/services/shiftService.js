/**
 * TURNOS (ENCARGADO) · llamadas a la API.
 *
 * Mismo contrato que el resto de servicios: devuelven { ok, status, data }
 * y nunca lanzan. Con ok, `data` ya viene desenvuelta (el turno o la
 * lista); sin ok, el mensaje de error está en data.message.
 *
 * Orden de los argumentos: primero los datos y el token al final, como en
 * taskService y serviceService.
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

// Solo funciona con turnos sin trabajadores: con alguno, la API da 409.
export const deleteShift = async (shiftId, token) => {
  return apiRequest(`/api/shifts/${shiftId}`, { method: "DELETE", token });
};
