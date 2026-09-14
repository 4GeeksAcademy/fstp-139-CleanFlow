/**
 * LLAMADAS AL BACKEND PARA EL CATÁLOGO DE TAREAS (ENCARGADO).
 *
 * Solo habla con la API: no toca el store, ni localStorage, ni navega.
 * Las cuatro rutas exigen el token de un encargado.
 *
 * Contrato: devuelven { ok, status, data } y NUNCA lanzan.
 *   - Si va bien, data es la tarea o la lista de tareas, ya desenvuelta.
 *   - Si va mal, el mensaje para el usuario está en data.message.
 */

import { apiRequest } from "./apiClient";

/** Todas las tareas, activas y desactivadas. data: array de tareas. */
export const getAllTasks = async (token) => {
  const result = await apiRequest("/api/manage/tasks", { token });

  if (!result.ok) return result;

  // Array.isArray: si la respuesta no trae una lista, la pantalla recibe
  // una vacía en vez de romperse al recorrerla.
  return { ...result, data: Array.isArray(result.data.tasks) ? result.data.tasks : [] };
};

/** Crea una tarea. taskData: { task_name, description?, is_active? }. data: la tarea creada. */
export const createTask = async (taskData, token) => {
  const result = await apiRequest("/api/tasks", { method: "POST", token, body: taskData });

  return result.ok ? { ...result, data: result.data.task } : result;
};

/** Edita el nombre y/o la descripción. El estado no se toca aquí. data: la tarea actualizada. */
export const updateTask = async (taskId, taskData, token) => {
  const result = await apiRequest(`/api/tasks/${taskId}`, { method: "PUT", token, body: taskData });

  return result.ok ? { ...result, data: result.data.task } : result;
};

/** Activa (true) o desactiva (false) una tarea. data: la tarea actualizada. */
export const toggleTaskStatus = async (taskId, isActive, token) => {
  const result = await apiRequest(`/api/tasks/${taskId}/status`, {
    method: "PATCH",
    token,
    body: { is_active: isActive },
  });

  return result.ok ? { ...result, data: result.data.task } : result;
};