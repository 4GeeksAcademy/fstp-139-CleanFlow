/**
 * LLAMADAS A LA API PARA EL CATÁLOGO DE TAREAS.
 *
 * Solo habla con la API (no toca store, localStorage ni navegación).
 * Dos partes: getTasks (pública, sin token) y la gestión del encargado.
 *
 * Devuelven { ok, status, data } y NUNCA lanzan. Si va bien, data es la
 * tarea o la lista ya desenvuelta; si va mal, el mensaje está en data.message.
 */

import { apiRequest } from "./apiClient";

// ----------------------------------------------------------------------
// CATÁLOGO PÚBLICO (WEB Y CLIENTE)
// ----------------------------------------------------------------------
// Sin token. El backend ya manda solo las activas y sin estado.

/** Tareas activas del catálogo compartido. data: array de tareas. */
export const getTasks = async () => {
  const result = await apiRequest("/api/tasks");

  if (!result.ok) return result;

  // Si la respuesta no trae una lista, se devuelve [] para no romper la pantalla.
  return { ...result, data: Array.isArray(result.data.tasks) ? result.data.tasks : [] };
};


// ----------------------------------------------------------------------
// GESTIÓN DEL CATÁLOGO (ENCARGADO)
// ----------------------------------------------------------------------
// Todas las rutas exigen el token de un encargado.

/** Todas las tareas, activas y desactivadas. data: array de tareas. */
export const getAllTasks = async (token) => {
  const result = await apiRequest("/api/manage/tasks", { token });

  if (!result.ok) return result;

  // Si la respuesta no trae una lista, se devuelve [] para no romper la pantalla.
  return { ...result, data: Array.isArray(result.data.tasks) ? result.data.tasks : [] };
};

/** Crea una tarea. taskData: { task_name, description?, is_active? }. data: la tarea creada. */
export const createTask = async (taskData, token) => {
  const result = await apiRequest("/api/tasks", { method: "POST", token, body: taskData });

  return result.ok ? { ...result, data: result.data.task } : result;
};

/** Edita nombre y/o descripción (el estado va por toggleTaskStatus). data: la tarea actualizada. */
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