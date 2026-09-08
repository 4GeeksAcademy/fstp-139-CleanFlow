/**
 * LLAMADAS AL BACKEND PARA EL CATÁLOGO DE SERVICIOS.
 *
 * Igual que authService.js: solo habla con la API. No toca el store, ni
 * localStorage, ni navega. De eso se encarga quien lo llama.
 *
 * Contrato: devuelve siempre { ok, data } y NUNCA lanza. Toda la
 * aplicación cuenta con eso, así que mantenlo al añadir funciones.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ----------------------------------------------------------------------
// PROVISIONAL — BORRAR CUANDO LA ISSUE WEB-02 ESTÉ HECHA
//
// GET /api/services no existe todavía, y sin él no se puede probar el
// desplegable del navbar. Mientras tanto se usa esta lista.
//
// Para quitarlo: borrar TEST_LIST, borrar TESTING_SERVICES y borrar el
// bloque marcado dentro del catch. Nada más.
//
// Los campos son los del modelo Service: los de la issue #11 más los tres
// que añade WEB-02 (slug, image_url y long_description).
// ----------------------------------------------------------------------

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
    // Desactivado a propósito: comprueba que NO sale en el navbar ni en el
    // pie. Con el backend real, ese filtro lo hará él.
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

// Cinturón de seguridad: el backend ya filtra por is_active, pero si algún
// día devolviera de más, la web no lo pinta. El Array.isArray protege de
// que la respuesta no sea una lista y se rompa al recorrerla.
const activeServices = (services) =>
  Array.isArray(services)
    ? services.filter((service) => service.is_active !== false)
    : [];

export const getServices = async () => {
  try {
    // Sin cabeceras ni token: es un endpoint público.
    const response = await fetch(`${BACKEND_URL}/api/services`);

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, data };
    }

    // data.services y no data: acordado con WEB-02, la respuesta viene
    // envuelta en un objeto como el resto de la API.
    return { ok: true, data: activeServices(data.services) };
  } catch (error) {
    // Aquí se cae cuando NO hay respuesta que interpretar: backend caído,
    // sin conexión, CORS... o, ahora mismo, porque el endpoint no existe y
    // Flask devuelve el index.html, que no es JSON.

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
