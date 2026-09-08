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

import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getProfile } from "../../services/userService"

export const ProtectedRoutes = () => {
    const { store, dispatch } = useGlobalReducer()

    // Ruta que el usuario está intentando abrir. Se le pasa al login para
    // poder devolverlo aquí después de autenticarse.
    const location = useLocation()

    // Distingue "nunca hubo sesión" de "la sesión caducó". Sin este dato,
    // el <Navigate> de abajo no podría saber si mostrar el aviso: cuando
    // se ejecuta, el token ya se ha borrado en los dos casos.
    const [sessionExpired, setSessionExpired] = useState(false)

    // ------------------------------------------------------------------
        // Revalidación asíncrona del token contra el backend (firma secreta).
        // Carga instantánea desde localStorage sin bloquear el render;
        // si el servidor lo rechaza, se corrige el estado después.
    // ------------------------------------------------------------------

    useEffect(() => {
        // Sin token no hay nada que revalidar; el <Navigate> de abajo se
        // encargará de echarlo al login.
        if (!store.token) return

        const revalidateSession = async () => {
            // getProfile nunca se rompe: si no hay respuesta lo traduce a
            // networkError. Por eso aquí ya no hace falta try/catch.
            const { ok, data, networkError } = await getProfile(store.token)

            // No hubo respuesta: backend caído, sin conexión, CORS. Eso no
            // es un token inválido, así que NO se cierra sesión: si no,
            // expulsaríamos al usuario cada vez que parpadea la red.
            if (networkError) return
 
            // Token inválido/caducado (401/422). Marcamos como caducado antes de LOGOUT
            // para que React agrupe (batch) el estado y muestre el aviso en el nuevo render.
            // LOGOUT limpia store/localStorage (token=null) y <Navigate> redirige automáticamente.
            if (!ok) {
                setSessionExpired(true)
                dispatch({ type: "LOGOUT" })
                return
            }

            // Sesión confirmada: se guarda el usuario actualizado, así un
            // cambio de rol en la base de datos se refleja sin esperar al
            // próximo login.
            dispatch({ type: "SET_USER", payload: data.user })
        }

        revalidateSession()

        // Dependencia [store.token] y no [store]: con el store entero, el
        // SET_USER de arriba lo cambiaría, el efecto se volvería a lanzar,
        // otro fetch, otro SET_USER... un bucle infinito de peticiones.
    }, [store.token])

    // ------------------------------------------------------------------
    // LA DECISIÓN
    // ------------------------------------------------------------------

    // Sin token, redirige al login.
    // `replace`: Evita el bucle al pulsar "Atrás".
    // `state`: Pasa la ruta previa y si la sesión caducó (sin mostrarlo en la URL).
    if (!store.token) {
        return (
            <Navigate
                to={"/login"}
                replace
                state={{ from: location, expired: sessionExpired }}
            />
        )
    }

    // Hay sesión: se pinta la ruta hija que corresponda (DashboardLayout
    // y, dentro, la página).
    return <Outlet />
}
