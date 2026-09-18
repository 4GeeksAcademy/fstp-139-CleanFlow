/**
 * LLAMADAS A LA API PARA EL CATÁLOGO DE SERVICIOS.
 *
 * Solo habla con la API (no toca store, localStorage ni navegación).
 * Dos partes: getServices (pública, sin token) y la gestión del encargado.
 *
 * Todas pasan por apiRequest: devuelven { ok, status, data } y NUNCA lanzan.
 * La app cuenta con eso: respétalo al añadir funciones.
 */

import { apiRequest } from "./apiClient";

// ----------------------------------------------------------------------
// CATÁLOGO PÚBLICO (WEB Y CLIENTE)
// ----------------------------------------------------------------------
// Sin token. El backend ya manda solo los activos y sin id ni estado.
// La usan el navbar y el pie (vía ServicesLoader) y el panel del cliente.

/** Servicios activos. data: array de servicios (vacío si no llega una lista). */
export const getServices = async () => {
  const result = await apiRequest("/api/services");

  if (!result.ok) return result;

  // Si la respuesta no trae una lista, [] para no romper el navbar ni el pie.
  return { ...result, data: Array.isArray(result.data.services) ? result.data.services : [] };
};


// ----------------------------------------------------------------------
// GESTIÓN DEL CATÁLOGO (ENCARGADO)
// ----------------------------------------------------------------------
// Rutas con token de encargado. Si va bien, data es el servicio o la
// lista; si va mal, el texto en data.message.

/** Todos los servicios, activos y desactivados. data: array de servicios. */
export const getAllServices = async (token) => {
  const result = await apiRequest("/api/manage/services", { token });

  if (!result.ok) return result;

  return { ...result, data: Array.isArray(result.data.services) ? result.data.services : [] };
};

/** Crea un servicio. El slug lo genera el backend. data: el servicio creado. */
export const createService = async (serviceData, token) => {
  const result = await apiRequest("/api/services", { method: "POST", token, body: serviceData });

  return result.ok ? { ...result, data: result.data.service } : result;
};

/** Edita solo lo enviado; ni slug ni estado (eso va por toggleServiceStatus). data: el servicio actualizado. */
export const updateService = async (serviceId, serviceData, token) => {
  const result = await apiRequest(`/api/services/${serviceId}`, { method: "PUT", token, body: serviceData });

  return result.ok ? { ...result, data: result.data.service } : result;
};

/** Activa (true) o desactiva (false) un servicio. data: el servicio actualizado. */
export const toggleServiceStatus = async (serviceId, isActive, token) => {
  const result = await apiRequest(`/api/services/${serviceId}/status`, {
    method: "PATCH",
    token,
    body: { is_active: isActive },
  });

  return result.ok ? { ...result, data: result.data.service } : result;
};