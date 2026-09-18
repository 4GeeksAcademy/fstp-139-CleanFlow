/**
 * LA ÚNICA FUNCIÓN QUE HACE FETCH A LA API DEL DASHBOARD.
 *
 * Los servicios (taskService, serviceService...) llaman a apiRequest, así
 * el token y la gestión de errores se escriben una sola vez.
 *
 * Devuelve siempre { ok, status, data, networkError? } y NUNCA lanza.
 * Si algo va mal, el texto para el usuario está en data.message.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const NETWORK_ERROR = "No se ha podido conectar con el servidor. Inténtalo de nuevo en unos segundos.";
const UNEXPECTED_RESPONSE = "El servidor ha respondido algo inesperado. Revisa la dirección y el método de la petición.";
const GENERIC_ERROR = "Ha ocurrido un error. Inténtalo de nuevo.";

/** Pide path (/api/...) con method ("GET" por defecto), token y body. data: el JSON recibido. */
export const apiRequest = async (path, { method = "GET", token, body } = {}) => {
  const headers = {};

  // Formato del JWT: "Bearer", un espacio y el token.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Un archivo viaja en un FormData, y entonces el Content-Type lo pone el
  // navegador: lleva un separador que hay que calcular. Si lo escribiéramos
  // a mano, el backend no encontraría el archivo.
  const isFormData = body instanceof FormData;

  // Sin esta cabecera, Flask no lee el cuerpo como JSON y
  // request.get_json() llega vacío.
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch (error) {
    // Sin respuesta (backend caído, sin conexión o CORS). networkError
    // permite distinguirlo de un error del backend como un 401.
    console.error(`Fallo de red en ${method} ${path}:`, error);

    return { ok: false, status: 0, networkError: true, data: { message: NETWORK_ERROR } };
  }

  // TRAMPA: si la ruta o el método no existen, la ruta comodín de Flask
  // devuelve el index.html de React. Sin esta comprobación, response.json()
  // fallaría y el usuario vería un falso "no se ha podido conectar".
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

  // El backend pone el error en claves distintas: msg (JWT, 401), error
  // (role_required 403 y login) y message (validaciones 400/404/409).
  // Se unifica en data.message para que las pantallas lean siempre lo mismo.
  if (!response.ok) {
    data = { ...data, message: data.message || data.error || data.msg || GENERIC_ERROR };
  }

  return { ok: response.ok, status: response.status, data };
};