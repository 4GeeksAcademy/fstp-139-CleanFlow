
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

// ----------------------------------------------------------------------
// PROVISIONAL — BORRAR CUANDO LA ISSUE WEB-02 ESTÉ HECHA
//
// El endpoint GET /api/services todavía no existe. Sin él no se puede
// construir ni probar el desplegable del navbar, así que mientras tanto se
// usa esta lista.
//
// Para borrarlo llegado el momento: quitar esta constante, quitar
// USAR_LISTA_DE_PRUEBA y quitar el bloque marcado dentro del catch.
// No hay que tocar nada más.
//
// Los campos son los que tendrá el modelo Service: los de la issue #11 más
// los tres que añade WEB-02 (slug, image_url y long_description).
// ----------------------------------------------------------------------

const TEST_LIST = true

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
        description: "Mantenimiento de espacios de trabajo, dentro o fuera de horario.",
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
        // Desactivado a propósito: sirve para comprobar que NO aparece en
        // el navbar ni en el footer. Cuando exista el backend de verdad,
        // este filtrado lo hará él y esta prueba se hará desde el panel.
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
]

const activeServices = (services) =>
    Array.isArray(services)
        ? services.filter((service) => service.is_active !== false)
        : []


export const getServices = async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/services`)

        const data = await response.json()

        if (!response.ok) {
            return { ok: false, data}
        }

        return { ok: true, data: onlyActives(data.services) }
   
    } catch (error) {
        if (TEST_LIST) {
            return { ok: true, data: onlyActives(TESTING_SERVICES) }
        }

        console.error("Network failure when requesting services:", error)

        return {
            ok: false,
            networkError: true,
            data: {
                error: "The service catalog could not be loaded."
            },
        }
    } 
}