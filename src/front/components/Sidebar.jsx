/**
 * Sidebar del dashboard.
 *
 * ESTE COMPONENTE ES UNA PRUEBA FUNCIONAL, NO UN DISEÑO FINAL.
 *
 * Lo creé para verificar que el filtrado por rol funciona: que cada
 * usuario ve solo sus secciones, más las comunes a todos (Inicio y Mi
 * cuenta, que no piden ningún rol).
 *
 * Quien haga el sidebar definitivo puede rehacer entero el diseño (lo
 * que va después del `return`): colores, iconos, un menú plegable, lo
 * que haga falta. Lo que NO debe cambiar es cómo funcionan los enlaces:
 * el array LINKS y el filtrado por rol de más abajo.
 */

import { NavLink, useNavigate } from "react-router-dom"
import useGlobalReducer from "../hooks/useGlobalReducer"


// ----------------------------------------------------------------------
// LINKS — LA GUÍA A SEGUIR
//
// Un único sitio donde se declara qué secciones existen y quién puede
// verlas. Es el equivalente en el frontend al @role_required("manager")
// de routes.py: mismo criterio, mismos roles.
//
//   roles: ["manager"]                       -> solo encargados
//   roles: ["worker"]                        -> solo trabajadores
//   roles: ["client"]                        -> solo clientes
//   roles: ["client", "worker", "manager"]   -> común a todos
//
// Para añadir una sección, se añade aquí una línea. No se escriben
// enlaces sueltos en el JSX: quedarían fuera del filtro y los vería
// todo el mundo.
//
// `end: true` solo lo lleva "Inicio". Sin él, ese enlace se quedaría
// marcado como activo en todas las páginas del dashboard, porque sus
// URLs empiezan por /dashboard.
//
// Si el diseño nuevo necesita más datos por enlace (un icono, por
// ejemplo), se añaden como una propiedad más a cada objeto.
//
// La lista va agrupada por rol con comentarios, solo para leerla mejor.
// El orden y los grupos no afectan a nada: quien decide es el campo
// `roles` de cada enlace. Se agrupa así, y no con una lista por rol,
// porque una sección puede pertenecer a varios a la vez sin duplicarla.
// ----------------------------------------------------------------------

const LINKS = [
    // --- Comunes a todos los roles ---
    { to: "/dashboard",                    label: "Inicio",        roles: ["client", "worker", "manager"], end: true },
    { to: "/dashboard/profile",            label: "Mi cuenta",     roles: ["client", "worker", "manager"] },

    // --- Solo CLIENT ---
    { to: "/dashboard/contracted-services", label: "Mis servicios", roles: ["client"] },

    // --- Solo WORKER ---
    { to: "/dashboard/tasks",              label: "Mis tareas",    roles: ["worker"] },

    // --- Solo MANAGER ---
    { to: "/dashboard/workers",            label: "Trabajadores",  roles: ["manager"] },
    { to: "/dashboard/services",           label: "Servicios",     roles: ["manager"] },
    { to: "/dashboard/shifts",             label: "Turnos",        roles: ["manager"] },
]

export const Sidebar = () => {

    // ------------------------------------------------------------------
    // LÓGICA — no hace falta tocarla para rediseñar
    //
    // Se pueden añadir cosas al lado (un useState para plegar el menú,
    // leer store.user?.name para saludar...), pero estas líneas valen
    // igual con cualquier diseño.
    // ------------------------------------------------------------------

    const { store, dispatch } = useGlobalReducer()
    const navigate = useNavigate()
    const role = store.user?.role

    // El filtro: cada enlace se queda solo si el rol actual está en su
    // lista. Si el rol es undefined (sesión aún sin cargar o datos
    // corruptos), no coincide con ninguno y no se muestra nada. Es lo
    // correcto: ante la duda, no enseñar de más.
    const visibleLinks = LINKS.filter(link => link.roles.includes(role))

    // LOGOUT limpia el store y localStorage; navigate saca al usuario de
    // la zona privada.
    const handleLogout = () => {
        dispatch({ type: "LOGOUT" })
        navigate("/login")
    }

    // ------------------------------------------------------------------
    // DISEÑO — esto es lo que hay que rehacer
    //
    // Provisional, con clases de Bootstrap. Se puede cambiar por completo
    // respetando tres cosas:
    //   1. Recorrer `visibleLinks`, nunca LINKS directamente.
    //   2. Usar <NavLink> (no <a>), que navega sin recargar la página y
    //      marca solo el enlace activo.
    //   3. Mantener la lógica del botón de cerrar sesión.
    // ------------------------------------------------------------------

    return (
        <div className="d-flex flex-column flex-shrink-0 p-3 text-bg-dark" style={{ width: "280px" }}>
            {/* Marca provisional. Al rehacerlo, cambiar este <a> por un
                <Link to="/">: un <a> recarga la aplicación entera. */}
            <a href="/dashboard" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                <span className="fs-4">Mi App</span>
            </a>

            <hr />

            <ul className="nav nav-pills flex-column mb-auto">
                {/* key: React necesita un identificador estable por elemento
                    al pintar una lista. La URL es única, así que sirve. */}
                {visibleLinks.map(link => (
                    <li className="nav-item" key={link.to}>
                        <NavLink
                            to={link.to}
                            end={link.end}
                            // NavLink admite una función en className: recibe
                            // isActive y añade "active" al enlace de la
                            // página en la que estás, sin comparar URLs a mano.
                            className={({ isActive }) =>
                                "nav-link text-white" + (isActive ? " active" : "")
                            }
                        >
                            {link.label}
                        </NavLink>
                    </li>
                ))}
            </ul>

            <hr />
            {/* <button> y no <a href="#">: cerrar sesión es una acción, no
                una navegación a otra página. */}
            <button
                type="button"
                onClick={handleLogout}
                className="btn btn-link nav-link text-white p-0 text-start"
            >
                Cerrar sesión
            </button>
        </div>
    )
};
