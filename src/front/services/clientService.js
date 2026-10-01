/**
 * CLIENTES (ENCARGADO). Las dos llamadas de la sección.
 *
 * El listado viene paginado del servidor: a diferencia de los
 * trabajadores, aquí se ven los clientes de toda la empresa y mandarlos
 * de golpe es una lista que crece sin tope. Por eso la búsqueda y las
 * pestañas también van en la petición, no se filtran en el navegador.
 *
 * Como todos los servicios, usa apiRequest: nunca lanza y el texto para
 * el usuario llega siempre en data.message.
 */

import { apiRequest } from "./apiClient";

/**
 * Una tanda de clientes.
 *
 *   q      texto del buscador (nombre, correo o teléfono)
 *   state  "all" | "active" | "inactive", la pestaña
 *   limit  cuántos
 *   offset desde cuál, para el "Ver más"
 *
 * data: { count, counts: { all, active, inactive }, clients: [...] }
 */
export const getClients = async (token, { q = "", state = "all", limit = 25, offset = 0 } = {}) => {
  const params = new URLSearchParams({ state, limit: String(limit), offset: String(offset) });

  // Solo si hay algo: un q vacío en la URL no estorba, pero ensucia el
  // historial del navegador y los registros del servidor.
  if (q.trim()) params.set("q", q.trim());

  return apiRequest(`/api/manage/clients?${params}`, { token });
};

/**
 * Da de alta o de baja a un cliente.
 *
 * De baja cancela sus servicios pendientes, así que la respuesta trae
 * `cancelled` con cuántos fueron: la pantalla lo necesita para poder
 * decir qué ha pasado en vez de limitarse a cambiar el interruptor.
 *
 * data: { client, cancelled }
 */
export const toggleClientStatus = async (token, userId, isActive) =>
  apiRequest(`/api/manage/clients/${userId}/status`, {
    method: "PATCH",
    token,
    body: { is_active: isActive },
  });
