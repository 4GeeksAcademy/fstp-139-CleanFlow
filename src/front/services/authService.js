/**
 * Llamadas al backend relacionadas con la autenticación.
 *
 * Los servicios solo hablan con la API: preparan la petición y devuelven
 * la respuesta en crudo. No tocan el store, ni localStorage, ni navegan.
 * De eso se encarga quien los llama (Login.jsx), y así esta función se
 * puede reutilizar desde cualquier sitio.
 *
 * Todas devuelven la misma forma: { ok, data }. Manténla al añadir
 * funciones nuevas, para que los componentes las usen todas igual.
 */

// La URL del backend cambia entre desarrollo y producción, así que se
// lee del .env (VITE_BACKEND_URL) en vez de escribirla a mano.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export const login = async (email, password) => {
    const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        // El cuerpo viaja como texto: JSON.stringify convierte el objeto.
        body: JSON.stringify({
            email,
            password,
        }),
        // Sin esta cabecera, Flask no interpreta el cuerpo como JSON y
        // request.get_json() llegaría vacío al backend.
        headers: {
            "Content-Type": "application/json",
        },
    });

    // Se lee el cuerpo tanto si fue bien como si no: en el caso de error
    // ahí viene el mensaje que el login muestra en pantalla.
    const data = await response.json();

    return {
        ok: response.ok,
        data,
    };
};
