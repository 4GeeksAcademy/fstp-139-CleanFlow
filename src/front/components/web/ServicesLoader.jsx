/**
 * CARGA EL CATÁLOGO DE SERVICIOS EN EL STORE.
 *
 * No pinta nada: existe solo por su efecto. Se monta una vez en main.jsx,
 * dentro de <StoreProvider>, así que la lista se pide al arrancar y no una
 * vez por cada componente que la necesite (navbar, footer, landing...).
 *
 * Es un componente aparte y no un useEffect dentro de StoreProvider para
 * que ese siga haciendo una sola cosa: proveer el estado.
 */

import { useEffect } from "react"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getServices } from "../../services/serviceService"

// Cuánto se considera "fresca" la lista: por debajo de esto no se vuelve
// a pedir.
const SERVICES_REFRESH_TIME = 5 * 60 * 1000

// FUERA del componente a propósito: así sobrevive a montajes y
// desmontajes. Dentro, en desarrollo se pediría dos veces, porque
// React.StrictMode monta cada componente por duplicado.
let lastRecharge = 0

export const ServicesLoader = () => {
    const { dispatch } = useGlobalReducer()

    useEffect(() => {
        const loadServices = async () => {
            if(Date.now() - lastRecharge < SERVICES_REFRESH_TIME) return

            // Se marca ANTES de esperar: si no, dos llamadas seguidas
            // saldrían las dos antes de que la primera terminara.
            lastRecharge = Date.now()

            dispatch({ type: "SET_SERVICES_LOADING" })

            const { ok, data } = await getServices()

            if (ok) {
                dispatch({ type: "SET_SERVICES", payload: data})
                return
            }

            dispatch({ type: "SET_SERVICES_ERROR" })
            // Si falla, se conserva la lista anterior y se marca el error.
            // Vaciar el catálogo por un fallo sería peor que enseñar la lista anterior.
            console.warn("The service catalog could not be updated.")

            // Se borra la marca para poder reintentar en el siguiente
            // regreso a la pestaña, sin esperar los cinco minutos.
            lastRecharge = 0

        }

        loadServices()

        // visibilitychange salta al irse Y al volver: de ahí la comprobación.
        const whenChangingView = () => {
            if (document.visibilityState == "visible") loadServices()
        }

        document.addEventListener("visibilitychange", whenChangingView)

        // Sin esta limpieza se acumularía un escuchador por cada montaje.
        return () => {
            document.removeEventListener("visibilitychange", whenChangingView)
        }

    // dispatch nunca cambia de identidad, así que esto se ejecuta una vez.
    }, [dispatch])

    return null
}
