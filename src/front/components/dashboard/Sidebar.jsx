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
 *
 * EN MÓVIL (menos de 768px) el sidebar se esconde: arriba sale una barra
 * con una hamburguesa que lo abre como panel encima de la página. Desde
 * 768px (tablet y escritorio) todo se ve como siempre. Los estilos de
 * móvil están en dashboard.css, bloque "SIDEBAR EN MÓVIL".
 */

import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"
// Los estilos del grupo desplegable y del menú de móvil (cf-side-*).
import "../../dashboard.css"


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
// GRUPOS: un objeto con `children` en vez de `to` no es un enlace, sino
// un desplegable que abre sus subenlaces. Los `roles` van en el grupo y
// valen para todos sus hijos.
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
    {
        label: "Administrar catálogo",
        roles: ["manager"],
        children: [
            { to: "/dashboard/services-catalog",       label: "Servicios" },
            { to: "/dashboard/tasks-catalog",   label: "Tareas de servicios" },
        ],
    },
    { to: "/dashboard/shifts",             label: "Turnos",        roles: ["manager"] },
]

// Mismo corte que el bloque "SIDEBAR EN MÓVIL" de dashboard.css.
const MOBILE_QUERY = "(max-width: 767.98px)"

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
    const { pathname } = useLocation()
    const role = store.user?.role

    // El filtro: cada enlace se queda solo si el rol actual está en su
    // lista. Si el rol es undefined (sesión aún sin cargar o datos
    // corruptos), no coincide con ninguno y no se muestra nada. Es lo
    // correcto: ante la duda, no enseñar de más.
    const visibleLinks = LINKS.filter(link => link.roles.includes(role))

    // Grupos abiertos o cerrados a mano. Se guardan junto a la URL en la
    // que se tocaron: al cambiar de página se olvidan, y cada grupo vuelve
    // a estar abierto solo si contiene la página en la que estás.
    const [toggled, setToggled] = useState({ pathname, groups: {} })
    const manualGroups = toggled.pathname === pathname ? toggled.groups : {}

    const isGroupCurrent = (group) => group.children.some(child => pathname.startsWith(child.to))
    const isGroupOpen = (group) => manualGroups[group.label] ?? isGroupCurrent(group)

    const toggleGroup = (group) => {
        setToggled({ pathname, groups: { ...manualGroups, [group.label]: !isGroupOpen(group) } })
    }

    // ------------------------------------------------------------------
    // MENÚ DE MÓVIL
    //
    // `menuOpen` solo tiene efecto por debajo de 768px: en tablet y
    // escritorio el CSS enseña el sidebar siempre y este valor da igual.
    // ------------------------------------------------------------------

    const [menuOpen, setMenuOpen] = useState(false)
    const toggleRef = useRef(null)
    const closeRef = useRef(null)
    const isFirstRender = useRef(true)

    const closeMenu = () => setMenuOpen(false)

    // El foco acompaña al menú: al abrir va a la ✕ y al cerrar vuelve a la
    // hamburguesa. En el primer render no se mueve, para no robarle el foco
    // a la página al entrar.
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }

        if (menuOpen) {
            closeRef.current?.focus()
        } else if (window.matchMedia(MOBILE_QUERY).matches) {
            toggleRef.current?.focus()
        }
    }, [menuOpen])

    // Con el menú abierto: Escape lo cierra y la página de detrás no se
    // desplaza. El return deshace las dos cosas al cerrar.
    useEffect(() => {
        if (!menuOpen) return

        const handleKeyDown = (event) => {
            if (event.key === "Escape") closeMenu()
        }

        document.addEventListener("keydown", handleKeyDown)
        document.body.style.overflow = "hidden"

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            document.body.style.overflow = ""
        }
    }, [menuOpen])

    // Si la pantalla crece hasta tablet con el menú abierto (girar el
    // móvil, por ejemplo), se cierra: allí el sidebar ya se ve fijo.
    useEffect(() => {
        const mobile = window.matchMedia(MOBILE_QUERY)

        const handleChange = (event) => {
            if (!event.matches) closeMenu()
        }

        mobile.addEventListener("change", handleChange)
        return () => mobile.removeEventListener("change", handleChange)
    }, [])

    // Cierre de sesión voluntario.
    //
    // El ORDEN importa. Primero se sale de la zona privada y después se
    // limpia la sesión:
    //
    //   - Así, cuando el token desaparece, ProtectedRoutes ya no está
    //     montado y no llega a ejecutar su <Navigate>. Si se hiciera al
    //     revés, ese <Navigate> podría dispararse antes y guardaría en el
    //     state la última ruta privada; al volver a entrar, el login
    //     devolvería al usuario allí en lugar de a /dashboard.
    //   - state: null deja explícito que aquí no se guarda ninguna ruta de
    //     origen: un logout voluntario siempre debe llevar a /dashboard.
    //   - replace evita que el botón "atrás" devuelva a la pantalla en la
    //     que estaba antes de cerrar sesión.
    const handleLogout = () => {
        navigate("/login", { replace: true, state: null })
        dispatch({ type: "LOGOUT" })
    }

    // NavLink admite una función en className: recibe isActive y añade
    // "active" al enlace de la página en la que estás, sin comparar URLs
    // a mano.
    const linkClass = ({ isActive }) => "nav-link text-white" + (isActive ? " active" : "")

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
        <>
            {/* ---- Solo en móvil: barra de arriba con la hamburguesa ----
                En tablet y escritorio, dashboard.css la oculta. */}
            <header className="cf-side-topbar">
                <Link to="/dashboard" className="cf-side-topbar__brand" onClick={closeMenu}>
                    Mi App
                </Link>

                {/* aria-controls dice QUÉ abre y aria-expanded si está abierto. */}
                <button
                    ref={toggleRef}
                    type="button"
                    className="cf-side-toggle"
                    onClick={() => setMenuOpen(true)}
                    aria-controls="dashboard-sidebar"
                    aria-expanded={menuOpen}
                    aria-label="Abrir menú"
                >
                    <i className="fa-solid fa-bars" aria-hidden="true" />
                </button>
            </header>

            {/* Solo en móvil: el fondo oscuro. Pulsarlo cierra el menú. */}
            <div className="cf-side-backdrop" hidden={!menuOpen} onClick={closeMenu} />

            {/* cf-side: en móvil, el panel que entra por la derecha. En tablet
                y escritorio esas clases no hacen nada y se ve como siempre. */}
            <div
                id="dashboard-sidebar"
                className={"cf-side d-flex flex-column flex-shrink-0 p-3 text-bg-dark" + (menuOpen ? " cf-side--open" : "")}
                style={{ width: "280px" }}
            >
                {/* Marca provisional. Al rehacerlo, cambiar este <a> por un
                    <Link to="/">: un <a> recarga la aplicación entera. */}
                <a href="/dashboard" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                    <span className="fs-4">Mi App</span>
                </a>

                {/* Solo en móvil: cerrar el panel. */}
                <button
                    ref={closeRef}
                    type="button"
                    className="cf-side-close"
                    onClick={closeMenu}
                    aria-label="Cerrar menú"
                >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>

                <hr />

                <ul className="nav nav-pills flex-column mb-auto">
                    {/* key: React necesita un identificador estable por elemento
                        al pintar una lista. La URL es única, así que sirve; en
                        los grupos, que no tienen URL, sirve su nombre.
                        onClick={closeMenu}: en móvil, elegir un enlace cierra el
                        panel; en escritorio no cambia nada. */}
                    {visibleLinks.map((link, index) => {
                        if (!link.children) {
                            return (
                                <li className="nav-item" key={link.to}>
                                    <NavLink to={link.to} end={link.end} className={linkClass} onClick={closeMenu}>
                                        {link.label}
                                    </NavLink>
                                </li>
                            )
                        }

                        // Un grupo: un <button> y no un enlace, porque no navega;
                        // solo abre y cierra sus subenlaces.
                        const open = isGroupOpen(link)
                        const groupId = `sidebar-group-${index}`

                        return (
                            <li className="nav-item" key={link.label}>
                                <button
                                    type="button"
                                    // --current: cerrado pero con la página actual
                                    // dentro, para que se sepa dónde estás.
                                    className={
                                        "nav-link text-white cf-side-group" +
                                        (!open && isGroupCurrent(link) ? " cf-side-group--current" : "")
                                    }
                                    onClick={() => toggleGroup(link)}
                                    aria-expanded={open}
                                    aria-controls={groupId}
                                >
                                    <span>{link.label}</span>
                                    <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                                </button>

                                <ul id={groupId} className="nav nav-pills flex-column cf-side-sub" hidden={!open}>
                                    {link.children.map(child => (
                                        <li className="nav-item" key={child.to}>
                                            <NavLink to={child.to} className={linkClass} onClick={closeMenu}>
                                                {child.label}
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        )
                    })}
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
        </>
    )
};
