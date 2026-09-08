/**
 * Guardián por rol. Deja pasar solo a los roles que recibe en `allowed`.
 *
 * Se usa en routes.jsx envolviendo las rutas de cada sección:
 *
 * NO es seguridad: cualquiera puede editar su rol en
 * localStorage y pasar de aquí. Solo evita que alguien acabe en una
 * pantalla que no le toca. Lo que protege los datos es el 403 del backend.
 */

import { Navigate, Outlet } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"

// allowed = [] por defecto: si algún día se olvida la prop, no pasa
// nadie. Ante un error, mejor denegar de más que de menos.
export const RoleRoute = ({ allowed = [] }) => {
    const { store } = useGlobalReducer()

    // El ?. evita reventar si store.user es null (por ejemplo, con los
    // datos corruptos en localStorage). En ese caso el rol es undefined,
    // no está en `allowed`, y no se deja pasar.
    if (!allowed.includes(store.user?.role)) {
        // A /dashboard, NO al login: el usuario sí tiene sesión, lo que
        // no tiene es permiso. Mandarlo al login sería desorientarlo.
        // `replace` evita que el botón atrás lo devuelva aquí en bucle.
        return <Navigate to="/dashboard" replace />
    }

    // Rol permitido: se pinta la ruta hija.
    return <Outlet />
}
