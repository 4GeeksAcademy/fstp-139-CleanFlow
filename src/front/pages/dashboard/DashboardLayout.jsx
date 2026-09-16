/**
 * MARCO DE LA ZONA PRIVADA.
 *
 * Envuelve todas las páginas de /dashboard: sidebar a un lado y, en el
 * <main>, la página que toca según la URL. Cada capa de routes.jsx responde
 * a una sola pregunta:
 *   ProtectedRoutes -> ¿hay sesión?
 *   DashboardLayout -> ¿qué marco pinto?   (este archivo)
 *   RoleRoute       -> ¿tiene permiso?
 */

import { Outlet } from "react-router-dom";
import { Sidebar } from "../../components/dashboard/Sidebar"

export const DashboardLayout = () => {
    return (
        // d-flex: sidebar y contenido en fila. minHeight: la barra oscura
        // llega hasta abajo aunque la página sea corta.
        // En móvil, cf-dash-layout y cf-dash-main (dashboard.css) lo pasan a
        // columna, con la barra de la hamburguesa encima.
        <div className="cf-dash-layout d-flex" style={{ minHeight: "100vh" }} >

            <Sidebar />

            {/* flex-grow-1: ocupa todo el ancho que deja el sidebar. */}
            <main className="cf-dash-main flex-grow-1 p-4">
                {/* Aquí React Router pinta la página hija según la URL. */}
                <Outlet />
            </main>

        </div>
    );
};
