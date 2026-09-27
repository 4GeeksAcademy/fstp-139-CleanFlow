/**
 * LA ENTRADA DEL PANEL (#21, #23, #24).
 *
 * /dashboard es la misma ruta para los tres roles, pero cada uno entra a
 * algo distinto: el cliente a ver cuándo viene alguien, el trabajador a
 * saber qué le toca hoy, el encargado a mirar cómo va el negocio. Aquí
 * solo se decide cuál de las tres se pinta.
 *
 * PARA AÑADIR LA TUYA: impórtala y pon su nombre en lugar del null que
 * le toca en HOMES. Nada más. Mientras sea null se ve el aviso.
 *
 * Ojo: esta ruta no puede redirigir a ninguna parte. RoleRoute manda
 * aquí a quien entra donde no le toca, así que un Navigate en esta
 * pantalla sería un bucle.
 *
 * Estilos: dashboard.css, sección 1 (cf-dash-state).
 */

import "../../../dashboard.css"
import useGlobalReducer from "../../../hooks/useGlobalReducer"
import { ManagerHome } from "./ManagerHome"

// El inicio de cada rol. null = todavía no existe.
const HOMES = {
    client: null,   // #23
    worker: null,   // #21
    manager: ManagerHome,  // #24
}

export const DashboardHome = () => {
    const { store } = useGlobalReducer()

    // El ?. por si store.user viniera vacío: entonces no hay rol, no hay
    // pantalla, y se cae en el aviso de abajo en vez de reventar.
    const Home = HOMES[store.user?.role]

    if (Home) return <Home />

    return (
        <div className="cf-dash-state">
            <span className="cf-dash-state__icon">
                <i className="fa-solid fa-house fa-2x" aria-hidden="true"></i>
            </span>
            <p className="cf-dash-state__title">Estamos preparando esta pantalla</p>
            <p className="cf-dash-state__text">
                Mientras tanto, entra por el menú a la sección que necesites.
            </p>
        </div>
    )
}