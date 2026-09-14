/**
 * LA ÚNICA FUNCIÓN QUE HABLA CON LA API DEL DASHBOARD.
 *
 * Los archivos de servicios (serviceService.js, taskService.js...) no
 * llaman a fetch directamente: llaman a apiRequest. Así las reglas de
 * abajo se escriben una vez y valen para todas las peticiones.
 *
 * Contrato, igual que el resto de servicios:
 *   - Devuelve siempre { ok, status, data }.
 *   - NUNCA lanza, pase lo que pase.
 *   - Si algo va mal, el texto para el usuario está SIEMPRE en data.message.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const NETWORK_ERROR = "No se ha podido conectar con el servidor. Inténtalo de nuevo en unos segundos.";
const UNEXPECTED_RESPONSE = "El servidor ha respondido algo inesperado. Revisa la dirección y el método de la petición.";
const GENERIC_ERROR = "Ha ocurrido un error. Inténtalo de nuevo.";

/**
 * @param {string} path     Ruta de la API, empezando por /api/...
 * @param {object} options  method ("GET" por defecto), token y body.
 */
export const apiRequest = async (path, { method = "GET", token, body } = {}) => {
  const headers = {};

  // Así se envía un JWT: "Bearer", un espacio y el token.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Solo si hay cuerpo. Sin esta cabecera, Flask no lo interpreta como
  // JSON y request.get_json() llega vacío.
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // Sin respuesta: backend caído, sin conexión o CORS. No es lo mismo
    // que un 401, y quien llama puede distinguirlo por networkError.
    console.error(`Fallo de red en ${method} ${path}:`, error);

    return { ok: false, status: 0, networkError: true, data: { message: NETWORK_ERROR } };
  }

  // LA TRAMPA DEL HTML: si la ruta no existe o el método no es el suyo,
  // Flask devuelve la página de React (index.html) con un 200. No es JSON,
  // y sin esta comprobación response.json() reventaría y el usuario vería
  // "no se ha podido conectar", que es mentira.
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    console.error(`${method} ${path} no ha devuelto JSON (estado ${response.status})`);

    return { ok: false, status: response.status, data: { message: UNEXPECTED_RESPONSE } };
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error(`${method} ${path} devolvió un JSON que no se puede leer:`, error);

    return { ok: false, status: response.status, data: { message: UNEXPECTED_RESPONSE } };
  }

  // LAS TRES CLAVES DE ERROR: el backend escribe el mensaje en un sitio
  // distinto según quién lo genere.
  //   msg      la librería de tokens (401 sin token)
  //   error    role_required (403) y el login
  //   message  nuestras validaciones (400, 404, 409)
  // Se copia a data.message para que las pantallas lean siempre lo mismo.
  if (!response.ok) {
    data = { ...data, message: data.message || data.error || data.msg || GENERIC_ERROR };
  }

  return { ok: response.ok, status: response.status, data };
};