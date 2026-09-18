/**
 * AJUSTES DE LA CUENTA: EL MARCO (#13).
 *
 * Pinta el título y las pestañas, y debajo la pestaña que toque según la
 * URL. Cada apartado tiene la suya, así se puede enlazar desde cualquier
 * sitio (por ejemplo, "Gestionar mis direcciones" desde la reserva).
 *
 *   /dashboard/profile            Datos personales
 *   /dashboard/profile/security   Seguridad
 *   /dashboard/profile/addresses  Direcciones (solo cliente)
 *
 * Estilos: dashboard.css (cf-dash-*, cf-account__*).
 */

import { NavLink, Outlet } from "react-router-dom"
import useGlobalReducer from "../../../hooks/useGlobalReducer"
import "../../../dashboard.css"

export const AccountLayout = () => {
    const { store } = useGlobalReducer()

    // Solo el cliente tiene direcciones: el encargado y el trabajador no
    // contratan servicios. La ruta también está protegida por RoleRoute.
    const isClient = store.user?.role === "client"

    return (
        <section className="cf-account">
            <h1 className="cf-account__title">Ajustes de la cuenta</h1>

            {/* NavLink marca la pestaña actual con aria-current="page", y de
                ahí la subraya el CSS. `end` en la primera: sin él saldría
                activa también en las otras dos. */}
            <nav aria-label="Apartados de la cuenta">
                <ul className="cf-account__tabs">
                    <li>
                        <NavLink to="/dashboard/profile" end>
                            Datos personales
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/dashboard/profile/security">Seguridad</NavLink>
                    </li>
                    {isClient && (
                        <li>
                            <NavLink to="/dashboard/profile/addresses">Direcciones</NavLink>
                        </li>
                    )}
                </ul>
            </nav>

            {/* Aquí React Router pinta el apartado según la URL. */}
            <Outlet />
        </section>
    )
}
