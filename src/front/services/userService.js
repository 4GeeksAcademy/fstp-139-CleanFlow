/**
 * Llamadas al backend relacionadas con el usuario.
 *
 * Mismo contrato que authService.js: solo habla con la API y devuelve
 * { ok, data }. No toca el store ni localStorage.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Pide al backend el usuario dueño del token.
 *
 * Lo usa ProtectedRoutes para revalidar la sesión: si responde ok, el
 * token sigue valiendo y devuelve el usuario actualizado; si no, es que
 * ya no vale y hay que cerrar sesión.
 */
export const getProfile = async (token) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/profile`, {
      method: "GET",
      // Así se envía un JWT: la palabra "Bearer", un espacio, y el token.
      // El backend lo lee de aquí y saca de él el user_id; por eso no hace
      // falta mandar ningún id en la URL.
      //
      // No lleva Content-Type porque un GET no envía cuerpo.
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    return {
      // false si el token está caducado, manipulado o no llega (401/422).
      // Quien llama decide qué hacer; aquí no se cierra sesión ni se
      // navega a ningún sitio.
      ok: response.ok,
      data,
    };
  } catch (error) {
    // Sin respuesta: backend caído, sin conexión o CORS. No significa que
    // el token sea inválido, y la diferencia importa: quien llama cierra
    // sesión cuando recibe ok: false. De ahí la marca networkError.
    console.error("No se pudo verificar la sesión:", error);

    return {
      ok: false,
      networkError: true,
      data: {
        error: "No se ha podido conectar con el servidor.",
      },
    };
  }
};
