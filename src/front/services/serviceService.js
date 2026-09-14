/**
 * LLAMADAS A LA API PARA EL CATÁLOGO DE SERVICIOS.
 *
 * Solo habla con la API (no toca store, localStorage ni navegación).
 * Dos partes: getServices para la web pública y la gestión del encargado.
 *
 * Todas devuelven { ok, data } (las del encargado, también status) y NUNCA
 * lanzan. La app cuenta con eso: respétalo al añadir funciones.
 */

import { apiRequest } from "./apiClient";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ----------------------------------------------------------------------
// PROVISIONAL: SERVICIOS DE PRUEBA (BORRAR AL CERRAR LA #36 / WEB-02)
// ----------------------------------------------------------------------
// Mientras no exista la ruta pública GET /api/services, ServicesLoader
// recibe esta lista. Para quitarlo: borrar TEST_LIST, TESTING_SERVICES y
// el bloque marcado en el catch de getServices. Campos: modelo Service.

const TEST_LIST = true;

const TESTING_SERVICES = [
  {
    service_id: 1,
    name: "Limpieza integral",
    slug: "limpieza-integral",
    description: "La limpieza completa de tu casa, de arriba abajo.",
    base_hourly_rate: 15.5,
    default_duration_minutes: 180,
    image_url: null,
    long_description: null,
    is_active: true,
  },
  {
    service_id: 2,
    name: "Limpieza profunda",
    slug: "limpieza-profunda",
    description: "Para cuando hace falta llegar donde no se llega a diario.",
    base_hourly_rate: 19,
    default_duration_minutes: 240,
    image_url: null,
    long_description: null,
    is_active: true,
  },
  {
    service_id: 3,
    name: "Limpieza de oficinas",
    slug: "limpieza-de-oficinas",
    description:
      "Mantenimiento de espacios de trabajo, dentro o fuera de horario.",
    base_hourly_rate: 17,
    default_duration_minutes: 120,
    image_url: null,
    long_description: null,
    is_active: true,
  },
  {
    service_id: 4,
    name: "Limpieza fin de obra",
    slug: "limpieza-fin-de-obra",
    description: "Retirada de polvo y restos tras una reforma.",
    base_hourly_rate: 22,
    default_duration_minutes: 300,
    image_url: null,
    long_description: null,
    is_active: true,
  },
  {
    // Desactivado a propósito: comprueba que NO sale en el navbar ni en el pie.
    service_id: 5,
    name: "Limpieza de cristales",
    slug: "limpieza-de-cristales",
    description: "Cristales y fachadas accesibles.",
    base_hourly_rate: 20,
    default_duration_minutes: 90,
    image_url: null,
    long_description: null,
    is_active: false,
  },
];

// ----------------------------------------------------------------------
// WEB PÚBLICA
// ----------------------------------------------------------------------
// getServices usa fetch directo, no apiRequest: no devuelve status y, si
// falla la red, el mensaje va en data.error (no en data.message).

// El backend ya filtra por is_active; esto es un cinturón de seguridad.
// Array.isArray evita romper la pantalla si la respuesta no es una lista.
const activeServices = (services) =>
  Array.isArray(services)
    ? services.filter((service) => service.is_active !== false)
    : [];

/** Servicios activos para la web pública (sin token). data: array de servicios. */
export const getServices = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/services`);

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, data };
    }

    // La API envuelve la lista en { services: [...] }, como el resto de rutas.
    return { ok: true, data: activeServices(data.services) };
  } catch (error) {
    // Sin JSON que leer: red caída, CORS o, mientras no exista la ruta,
    // el index.html que devuelve la ruta comodín de Flask.

    // ---- PROVISIONAL: se va con TESTING_SERVICES ----
    if (TEST_LIST) {
      return { ok: true, data: activeServices(TESTING_SERVICES) };
    }
    // ---- fin del bloque provisional ----

    console.error("Network failure when requesting services:", error);

    return {
      ok: false,
      networkError: true,
      data: {
        error: "The service catalog could not be loaded.",
      },
    };
  }
};


// ----------------------------------------------------------------------
// GESTIÓN DEL CATÁLOGO (ENCARGADO)
// ----------------------------------------------------------------------
// Rutas con token de encargado, vía apiRequest: { ok, status, data }. Si va
// bien, data es el servicio o la lista; si va mal, el texto en data.message.

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