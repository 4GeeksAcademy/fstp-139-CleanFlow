/**
 * CARGA LA NOTA DE CLEANFLOW Y SUS ÚLTIMAS OPINIONES EN EL STORE.
 *
 * No pinta nada: existe solo por su efecto, igual que ServicesLoader. Se
 * monta una vez en main.jsx para que el dato se pida al arrancar y no
 * una vez por cada sitio que lo enseña: el hero y la sección de
 * opiniones están en la misma pantalla y pedían lo mismo dos veces.
 *
 * Si falla no se despacha nada: se conserva lo que hubiera. Quedarse sin
 * la banda del hero por un fallo de red es mejor que enseñar un cero.
 */

import { useEffect } from "react"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getReviewsSummary } from "../../services/reviewService"

// Cuánto se considera "fresca". Cinco minutos, como el catálogo: una
// opinión más no cambia la media de forma que nadie note.
const REVIEWS_REFRESH_TIME = 5 * 60 * 1000

// FUERA del componente a propósito: así sobrevive a montajes y
// desmontajes. Dentro, en desarrollo se pediría dos veces, porque
// React.StrictMode monta cada componente por duplicado.
let lastRecharge = 0

export const ReviewsLoader = () => {
    const { dispatch } = useGlobalReducer()

    useEffect(() => {
        const loadReviews = async () => {
            if (Date.now() - lastRecharge < REVIEWS_REFRESH_TIME) return

            // Se marca ANTES de esperar: si no, dos llamadas seguidas
            // saldrían las dos antes de que la primera terminara.
            lastRecharge = Date.now()

            const { ok, data } = await getReviewsSummary()

            if (ok) {
                dispatch({
                    type: "SET_REVIEWS",
                    payload: {
                        average: data.average,
                        total: data.total ?? 0,
                        reviews: data.reviews || [],
                    },
                })
                return
            }

            console.warn("The public reviews could not be loaded.")

            // Se borra la marca para poder reintentar al volver a la
            // pestaña, sin esperar los cinco minutos.
            lastRecharge = 0
        }

        loadReviews()

        // visibilitychange salta al irse Y al volver: de ahí la comprobación.
        const whenChangingView = () => {
            if (document.visibilityState === "visible") loadReviews()
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
