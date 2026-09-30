/**
 * Llamadas al backend relacionadas con la autenticación.
 *
 * Los servicios solo hablan con la API: preparan la petición y devuelven
 * la respuesta en crudo. No tocan el store, ni localStorage, ni navegan.
 * De eso se encarga quien los llama (Login.jsx), y así esta función se
 * puede reutilizar desde cualquier sitio.
 *
 * Todas devuelven la misma forma: { ok, data }, también cuando no hay
 * respuesta. Manténla al añadir funciones nuevas.
 */

// La URL del backend cambia entre desarrollo y producción, así que se
// lee del .env (VITE_BACKEND_URL) en vez de escribirla a mano.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export const login = async (email, password) => {
    try {
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
    } catch (error) {
        // Sin respuesta: backend caído, sin conexión o CORS. Un 401 NO entra
        // aquí. El mensaje va en data.message, la misma clave que usa la
        // API, para que la pantalla lo pinte por el camino de siempre.
        console.error("Fallo de red al iniciar sesión:", error);

        return {
            ok: false,
            networkError: true,
            data: {
                message: "No se ha podido conectar con el servidor. Inténtalo de nuevo en unos segundos.",
            },
        };
    }
};

/**
 * Crea una cuenta de cliente con { name, last_name, email, phone, password }.
 *
 * No abre la sesión: de eso se encarga Register.jsx, que llama a login()
 * justo después con los mismos datos (WEB-15).
 */
export const register = async (formData) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/register`, {
            method: "POST",
            // Sin esta cabecera, Flask no lee el cuerpo como JSON.
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
        });

        // El cuerpo se lee también cuando va mal: ahí viene el mensaje, por
        // ejemplo el 409 de "El correo electrónico ya está registrado".
        const data = await response.json();

        return {
            ok: response.ok,
            data,
        };
    } catch (error) {
        // Sin respuesta (backend caído o sin conexión). Mismo formato que
        // login(): el mensaje va en data.message.
        console.error("Fallo de red al registrar usuario:", error);

        return {
            ok: false,
            networkError: true,
            data: {
                message: "No se ha podido conectar con el servidor. Inténtalo de nuevo en unos segundos.",
            },
        };
    }
};

/**
 * Entra o se registra con Google.
 *
 * `credential` es el token firmado que devuelve Google. Aquí solo se
 * reenvía: quien comprueba que la firma es de verdad es el backend, y
 * es lo único que sostiene esta puerta.
 *
 * Responde igual que login(): { token, user }. Al frontend le da lo
 * mismo por dónde haya entrado el usuario.
 */
export const loginWithGoogle = async (credential) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ credential }),
        });

        const data = await response.json();

        return {
            ok: response.ok,
            data,
        };
    } catch (error) {
        console.error("Fallo de red al entrar con Google:", error);

        return {
            ok: false,
            networkError: true,
            data: {
                message: "No se ha podido conectar con el servidor. Inténtalo de nuevo en unos segundos.",
            },
        };
    }
};

/**
 * Guarda el teléfono que falta tras entrar con Google.
 *
 * Devuelve el usuario ya actualizado, para repintar la sesión sin tener
 * que volver a pedirlo.
 */
export const setAccountPhone = async (phone, token) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/account/phone`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ phone }),
        });

        const data = await response.json();

        return {
            ok: response.ok,
            data,
        };
    } catch (error) {
        console.error("Fallo de red al guardar el teléfono:", error);

        return {
            ok: false,
            networkError: true,
            data: {
                message: "No se ha podido conectar con el servidor. Inténtalo de nuevo en unos segundos.",
            },
        };
    }
};
