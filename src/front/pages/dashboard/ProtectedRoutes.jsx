/**
 * Guardián de sesión de toda la zona privada.
 *
 * Responde a una sola pregunta: ¿hay sesión? Si no la hay, saca al
 * usuario al login; si la hay, deja pasar y además comprueba con el
 * backend que el token siga siendo válido.
 *
 * Se monta en routes.jsx como ruta "pathless" (sin path propio)
 * envolviendo a /dashboard: añade la comprobación sin añadir ningún
 * tramo a la URL.
 *
 * No decide permisos: de eso se encarga RoleRoute.
 */

import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getProfile } from "../../services/userService"

export const ProtectedRoutes = () => {
    const { store, dispatch } = useGlobalReducer()

    // ------------------------------------------------------------------
    // REVALIDACIÓN CONTRA EL BACKEND
    //
    // El navegador no puede saber por su cuenta si un token es válido:
    // va firmado con una clave que solo conoce el servidor. 
    //
    // Se hace en segundo plano, sin bloquear el render: el usuario ya
    // viene de localStorage, así que la página se pinta al instante y
    // se corrige después si el servidor dice que no.
    // ------------------------------------------------------------------

    useEffect(() => {
        // Sin token no hay nada que revalidar; el <Navigate> de abajo se
        // encargará de echarlo al login.
        if (!store.token) return

        const revalidateSession = async () => {
            try {
                const { ok, data } = await getProfile(store.token)

                if (ok) {
                    // El servidor confirma la sesión y devuelve el usuario
                    // actualizado. Así, si alguien le cambió el rol en la
                    // base de datos, se refleja sin esperar al próximo login.
                    dispatch({ type: "SET_USER", payload: data.user })
                } else {
                    // El servidor rechaza el token (401 o 422: caducado,
                    // manipulado o inválido). LOGOUT limpia el store y
                    // localStorage; eso deja store.token a null y provoca
                    // un nuevo render, donde el <Navigate> de abajo hace el
                    // resto. Por eso aquí no hace falta navegar a mano:
                    // hay una única salida hacia el login en todo el
                    // componente.
                    dispatch({ type: "LOGOUT" })
                }
            } catch (error) {
                // Aquí solo se llega si NO hubo respuesta: backend caído,
                // sin conexión, CORS. Eso no es un token inválido, así que
                // NO se cierra sesión: expulsaríamos al usuario cada vez
                // que se cae el servidor o parpadea la red.
                //
                // Ojo con la distinción: un 401 NO entra en este catch.
                // Para fetch, recibir un 401 es un éxito (preguntaste y te
                // contestaron); se detecta arriba con el if (ok).
                console.error("No se pudo verificar la sesión:", error)
            }
        }

        revalidateSession()

        // Dependencia [store.token] y no [store]: con el store entero, el
        // SET_USER de arriba lo cambiaría, el efecto se volvería a lanzar,
        // otro fetch, otro SET_USER... un bucle infinito de peticiones.
    }, [store.token])

    // ------------------------------------------------------------------
    // LA DECISIÓN
    // ------------------------------------------------------------------

    // Sin token, fuera. `replace` sustituye la entrada del historial en
    // vez de añadir una: sin él, el botón "atrás" devolvería al usuario a
    // la ruta privada, que volvería a expulsarlo, en bucle.
    if (!store.token) {
        return <Navigate to={"/login"} replace />
    }

    // Hay sesión: se pinta la ruta hija que corresponda (DashboardLayout
    // y, dentro, la página).
    return <Outlet />
}
