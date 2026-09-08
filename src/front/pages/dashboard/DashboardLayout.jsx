/**
 * Marco de la zona privada.
 *
 * Es el layout que envuelve a todas las páginas del dashboard: pinta el
 * sidebar fijo a la izquierda y deja a la derecha el hueco donde React
 * Router inyecta la página que toque según la URL.
 *
 * Se monta en routes.jsx como padre de las rutas de /dashboard, por
 * debajo de ProtectedRoutes. Cada capa responde a una sola pregunta:
 *   ProtectedRoutes -> ¿hay sesión?
 *   DashboardLayout -> ¿qué marco pinto?      (este archivo)
 *   RoleRoute       -> ¿tiene permiso?
 */

import { Outlet } from "react-router-dom";
import { Sidebar } from "../../components/Sidebar"

export const DashboardLayout = () => {
    return (
        // d-flex coloca sidebar y contenido en fila (uno al lado del otro).
        // Sin esto se apilarían en vertical, que es el comportamiento por
        // defecto de dos <div>.
        // minHeight 100vh: que la barra oscura llegue hasta abajo aunque la
        // página tenga poco contenido.
        <div className="d-flex" style={{ minHeight: "100vh" }} >

            {/* Fijo en todas las páginas del dashboard. Su ancho (280px)
                lo define el propio componente. */}
            <Sidebar />

            {/* flex-grow-1: ocupa todo el espacio que sobra a la derecha
                del sidebar. p-4 separa el contenido del borde. */}

            <main className="flex-grow-1 p-4">
                {/* Aquí React Router inyecta la página hija según la URL. */}
                <Outlet />
            </main>

        </div>
    );
};
