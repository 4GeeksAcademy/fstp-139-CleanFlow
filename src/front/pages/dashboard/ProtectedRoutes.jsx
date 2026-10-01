/**
 * Guardián de sesión de toda la zona privada.
 *
 * Responde a dos preguntas: ¿hay sesión? y ¿está completa la cuenta?
 * Sin sesión, al login; con la cuenta a medias —entró con Google y le
 * falta el teléfono—, al paso que lo pide. Si todo está, deja pasar y
 * además comprueba con el backend que el token siga siendo válido.
 *
 * Los dos desvíos se llevan la ruta que el usuario intentaba abrir, para
 * poder devolverlo ahí en cuanto resuelva lo que le falte.
 *
 * Se monta en routes.jsx como ruta "pathless" (sin path propio)
 * envolviendo a /dashboard: añade la comprobación sin añadir ningún
 * tramo a la URL.
 *
 * No decide permisos: de eso se encarga RoleRoute.
 */

import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getProfile } from "../../services/userService"
import { loginPathForRole } from "../../authPaths";

export const ProtectedRoutes = () => {
    const { store, dispatch } = useGlobalReducer()

    // Ruta que el usuario está intentando abrir. Viaja en los dos desvíos
    // —login y teléfono— para poder devolverlo aquí al terminar.
    const location = useLocation()

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
 
            // Token inválido o caducado (401/422). LOGOUT limpia store y
            // localStorage, y de paso guarda el rol y el motivo de la
            // salida; el <Navigate> de abajo los lee para elegir la puerta
            // y avisar. Es el mismo camino que siguen las pantallas del
            // panel cuando reciben un 401 en sus propias llamadas.
            if (!ok) {
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

    // Sin token, a la puerta que le toca (WEB-10).
    //
    // lastRole solo cuenta si la sesión CADUCÓ: entonces el usuario estaba
    // trabajando y hay que devolverlo a la suya. Al salir a propósito, el
    // sidebar ya navega él mismo antes de limpiar la sesión.
    //
    // Fuera de ese caso se manda a la de clientes, que es la pública y la
    // única que ofrece crear una cuenta. Si no, "Reservar ahora" acababa en
    // la puerta del equipo cuando en esa pestaña había entrado antes un
    // encargado, y al visitante se le pedía una cuenta que no puede crear.
    //
    // `replace`: evita el bucle al pulsar "Atrás".
    // `state`: la ruta previa y si la sesión caducó, sin enseñarlo en la URL.
    if (!store.token) {
        const rolePrevio = store.sessionExpired ? store.lastRole : null

        return (
            <Navigate
                to={loginPathForRole(store.user?.role || rolePrevio)}
                replace
                state={{ from: location, expired: store.sessionExpired }}
            />
        )
    }

    // Hay sesión pero la cuenta está a medias: entró con Google, que no
    // da el teléfono, y sin él no se puede avisar al cliente el día del
    // servicio. La guarda va aquí y no en un useEffect de la pantalla,
    // que si no se cuela escribiendo la URL a mano.
    //
    // Se lleva el destino, igual que el desvío al login: quien venía a
    // contratar tiene que acabar contratando, y no en el panel.
    if (store.user?.needs_phone) {
        return <Navigate to="/completar-perfil" replace state={{ from: location }} />
    }

    // Hay sesión: se pinta la ruta hija que corresponda (DashboardLayout
    // y, dentro, la página).
    return <Outlet />
}
