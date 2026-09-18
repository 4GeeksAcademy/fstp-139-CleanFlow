/**
 * LLAMADAS A LA API PARA LA CUENTA DEL USUARIO (#13).
 *
 * Solo habla con la API (no toca store, localStorage ni navegación).
 * Todas piden el token y valen para cualquier rol; lo que cada uno puede
 * cambiar lo decide el backend.
 *
 * Devuelven { ok, status, data } y NUNCA lanzan. Si va mal, el mensaje
 * está en data.message.
 */

import { apiRequest } from "./apiClient";

/** Datos de la pantalla de ajustes. data: { name, last_name, phone, email, role, avatar_url }. */
export const getAccount = async (token) => {
  const result = await apiRequest("/api/account", { token });

  return result.ok ? { ...result, data: result.data.account } : result;
};

/**
 * Edita nombre, apellidos y teléfono (lo que se envíe).
 * data: { account, user }. `user` es para despachar SET_USER, que refresca
 * el bloque del sidebar sin recargar.
 */
export const updateAccount = async (accountData, token) => {
  return await apiRequest("/api/account", { method: "PUT", token, body: accountData });
};

/** Cambia la contraseña. Si va bien, data.message; si no, también. */
export const changePassword = async (currentPassword, newPassword, token) => {
  return await apiRequest("/api/account/password", {
    method: "PUT",
    token,
    body: { current_password: currentPassword, new_password: newPassword },
  });
};

/**
 * Sube la foto de perfil. `file` es el File del <input type="file">.
 * Va en un FormData, no en JSON: es un archivo. data: { account, user }.
 */
export const uploadAvatar = async (file, token) => {
  const body = new FormData();
  // "avatar": el nombre del campo que espera el backend.
  body.append("avatar", file);

  return await apiRequest("/api/account/avatar", { method: "POST", token, body });
};

/** Quita la foto: vuelven las iniciales. data: { account, user }. */
export const removeAvatar = async (token) => {
  return await apiRequest("/api/account/avatar", { method: "DELETE", token });
};