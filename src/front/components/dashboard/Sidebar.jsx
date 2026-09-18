/**
 * SIDEBAR DEL DASHBOARD.
 *
 * DISEÑO PROVISIONAL: lo que va tras el `return` se puede rehacer entero
 * (colores, iconos...). Lo que NO debe cambiar: el array LINKS y el filtro
 * por rol, que hacen que cada usuario vea solo sus secciones.
 *
 * En móvil (menos de 768px) se esconde tras una barra con hamburguesa y se
 * abre como panel lateral. En tablet y escritorio se ve fijo, como siempre.
 * Estilos de móvil: dashboard.css, bloque "SIDEBAR EN MÓVIL".
 */

import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { Avatar } from "./Avatar"
// Estilos del grupo desplegable y del menú de móvil (cf-side-*).
import "../../dashboard.css"


// ----------------------------------------------------------------------
// LINKS (LA GUÍA A SEGUIR)
// ----------------------------------------------------------------------
// Único sitio que dice qué secciones hay y quién las ve: el equivalente al
// @role_required de routes.py. Para añadir una sección, añade aquí una línea;
// un enlace suelto en el JSX se saltaría el filtro y lo vería todo el mundo.
//
//   roles: ["manager"] / ["worker"] / ["client"]  -> solo ese rol
//   roles: ["client", "worker", "manager"]         -> común a todos
//   children: [...] en vez de `to`  -> grupo desplegable; sus `roles` valen para los hijos
//   end: true (solo Inicio)         -> sin él, saldría activo en todo /dashboard
//
// "Mi cuenta" ya no está aquí: se entra por "Ajustes", en el bloque de
// usuario de abajo.
//
// Decide `roles`, no el orden: los comentarios por rol son solo para leer.
// ¿Más datos por enlace (un icono)? Se añaden como otra propiedad.

const LINKS = [
    // --- Comunes a todos los roles ---
    { to: "/dashboard",                    label: "Inicio",        roles: ["client", "worker", "manager"], end: true },

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

    // ----------------------------------------------------------------------
    // LÓGICA (NO HACE FALTA TOCARLA PARA REDISEÑAR)
    // ----------------------------------------------------------------------

    const { store, dispatch } = useGlobalReducer()
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const role = store.user?.role

    // Solo los enlaces del rol actual. Sin rol (sesión sin cargar o datos
    // corruptos) no sale nada: ante la duda, no enseñar de más.
    const visibleLinks = LINKS.filter(link => link.roles.includes(role))

    // Nombre completo del bloque de usuario. Con filter: si a una sesión
    // guardada antes de la #13 le falta el apellido, sale solo el nombre.
    const fullName = [store.user?.name, store.user?.last_name].filter(Boolean).join(" ")

    // Grupos abiertos o cerrados a mano, junto a la URL donde se tocaron. Al
    // cambiar de página se olvidan: cada grupo se abre si contiene la página actual.
    const [toggled, setToggled] = useState({ pathname, groups: {} })
    const manualGroups = toggled.pathname === pathname ? toggled.groups : {}

    const isGroupCurrent = (group) => group.children.some(child => pathname.startsWith(child.to))
    const isGroupOpen = (group) => manualGroups[group.label] ?? isGroupCurrent(group)

    const toggleGroup = (group) => {
        setToggled({ pathname, groups: { ...manualGroups, [group.label]: !isGroupOpen(group) } })
    }

    // ----------------------------------------------------------------------
    // MENÚ DE MÓVIL
    // ----------------------------------------------------------------------
    // `menuOpen` solo actúa por debajo de 768px; en tablet y escritorio el CSS
    // muestra siempre el sidebar.

    const [menuOpen, setMenuOpen] = useState(false)
    const toggleRef = useRef(null)
    const closeRef = useRef(null)
    const isFirstRender = useRef(true)

    const closeMenu = () => setMenuOpen(false)

    // El foco sigue al menú: al abrir va a la ✕ y al cerrar vuelve a la
    // hamburguesa. En el primer render no se mueve, para no robárselo a la página.
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

    // Con el menú abierto: Escape lo cierra y la página de detrás no hace
    // scroll. El return deshace las dos cosas al cerrar.
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

    // Si la pantalla crece a tablet con el menú abierto (al girar el móvil),
    // se cierra: allí el sidebar ya se ve fijo.
    useEffect(() => {
        const mobile = window.matchMedia(MOBILE_QUERY)

        const handleChange = (event) => {
            if (!event.matches) closeMenu()
        }

        mobile.addEventListener("change", handleChange)
        return () => mobile.removeEventListener("change", handleChange)
    }, [])

    // ----------------------------------------------------------------------
    // CIERRE DE SESIÓN
    // ----------------------------------------------------------------------
    // El ORDEN importa: primero navegar, luego LOGOUT. Al revés, ProtectedRoutes
    // vería el token borrado y su <Navigate> guardaría la ruta privada, así que
    // el próximo login volvería allí en vez de a /dashboard.
    // state: null (sin ruta de origen) y replace ("atrás" no vuelve aquí).
    const handleLogout = () => {
        navigate("/login", { replace: true, state: null })
        dispatch({ type: "LOGOUT" })
    }

    // ----------------------------------------------------------------------
    // DISEÑO (PROVISIONAL: ESTO ES LO QUE HAY QUE REHACER)
    // ----------------------------------------------------------------------
    // Clases de Bootstrap. Se puede cambiar entero respetando tres cosas:
    //   1. Recorrer `visibleLinks`, nunca LINKS.
    //   2. Usar <NavLink> (no <a>): navega sin recargar y marca el activo.
    //   3. Mantener la lógica de cerrar sesión.

    // NavLink pasa isActive a className: marca el enlace de la página actual.
    const linkClass = ({ isActive }) => "nav-link text-white" + (isActive ? " active" : "")

    return (
        <>
            {/* Solo en móvil: barra superior con la hamburguesa a la derecha.
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

            {/* cf-side: en móvil, panel que entra por la derecha. En tablet y
                escritorio esas clases no hacen nada. */}
            <div
                id="dashboard-sidebar"
                className={"cf-side d-flex flex-column flex-shrink-0 p-3 text-bg-dark" + (menuOpen ? " cf-side--open" : "")}
                style={{ width: "280px" }}
            >
                {/* Marca provisional. Al rehacerla, cambiar este <a> por un
                    <Link>: un <a> recarga la aplicación entera. */}
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
                    {/* key: la URL, o el nombre en los grupos (no tienen URL).
                        onClick={closeMenu}: en móvil, elegir un enlace cierra el panel. */}
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

                        // Grupo: <button> y no enlace, porque no navega; solo abre y cierra.
                        const open = isGroupOpen(link)
                        const groupId = `sidebar-group-${index}`

                        return (
                            <li className="nav-item" key={link.label}>
                                <button
                                    type="button"
                                    // --current: cerrado con la página actual dentro.
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

                {/* BLOQUE DE USUARIO (#13): quién ha entrado, sus ajustes y
                    salir. Con utilidades de Bootstrap, como el resto del
                    sidebar: vestirlo es de otra issue.
                    El avatar y el nombre cambian solos al guardar en Ajustes,
                    porque esas pantallas despachan SET_USER. */}
                <div className="cf-side-user">
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <Avatar user={store.user} size="sm" />

                        {/* text-truncate: un correo largo no debe ensanchar el panel. */}
                        <div className="text-truncate">
                            <div className="text-white text-truncate">{fullName}</div>
                            <div className="text-white-50 small text-truncate">{store.user?.email}</div>
                        </div>
                    </div>

                    <NavLink to="/dashboard/profile" className={linkClass} onClick={closeMenu}>
                        Ajustes
                    </NavLink>

                    {/* <button> y no <a href="#">: cerrar sesión es una acción, no una navegación. */}
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="btn btn-link nav-link text-white p-0 text-start"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </>
    )
};