/**
 * LLAMADAS A LA API PARA LAS DIRECCIONES DEL CLIENTE (#13).
 *
 * Solo habla con la API (no toca store, localStorage ni navegación).
 * Todas exigen el token de un cliente: el backend responde 403 a los demás
 * roles y 404 a la dirección de otro cliente.
 *
 * Devuelven { ok, status, data } y NUNCA lanzan. Si va mal, el mensaje
 * está en data.message.
 *
 * Las que cambian la principal devuelven la lista entera ya reordenada, y
 * así la pantalla no tiene que recalcular cuál es cuál.
 */

import { apiRequest } from "./apiClient";

/** Si la respuesta no trae una lista, [] para no romper la pantalla. */
const addressList = (data) => (Array.isArray(data.addresses) ? data.addresses : []);

/** Direcciones activas, la principal primero. data: array de direcciones. */
export const getAddresses = async (token) => {
  const result = await apiRequest("/api/addresses", { token });

  return result.ok ? { ...result, data: addressList(result.data) } : result;
};

/** Crea una dirección. La primera del cliente nace como principal. data: la dirección creada. */
export const createAddress = async (addressData, token) => {
  const result = await apiRequest("/api/addresses", { method: "POST", token, body: addressData });

  return result.ok ? { ...result, data: result.data.address } : result;
};

/** Edita solo lo enviado; ni la principal ni el estado (van por su ruta). data: la dirección actualizada. */
export const updateAddress = async (addressId, addressData, token) => {
  const result = await apiRequest(`/api/addresses/${addressId}`, { method: "PUT", token, body: addressData });

  return result.ok ? { ...result, data: result.data.address } : result;
};

/** Marca una dirección como principal. data: la lista actualizada. */
export const setDefaultAddress = async (addressId, token) => {
  const result = await apiRequest(`/api/addresses/${addressId}/default`, { method: "PATCH", token });

  return result.ok ? { ...result, data: addressList(result.data) } : result;
};

/** Quita una dirección de la lista (el backend la desactiva). data: la lista actualizada. */
export const deleteAddress = async (addressId, token) => {
  const result = await apiRequest(`/api/addresses/${addressId}`, { method: "DELETE", token });

  return result.ok ? { ...result, data: addressList(result.data) } : result;
};