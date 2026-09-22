/**
 * SIDEBAR DEL DASHBOARD.
 *
 * Tarjeta verde con la marca arriba, las secciones del rol en medio
 * (agrupadas y con icono) y abajo quién ha entrado, sus ajustes y salir.
 *
 * Lo que NO debe cambiar al tocar el diseño: el array LINKS y el filtro
 * por rol, que hacen que cada usuario vea solo sus secciones.
 *
 * En móvil (menos de 768px) se esconde tras una barra con hamburguesa y se
 * abre como panel lateral. En tablet y escritorio se ve fijo.
 * Estilos: dashboard.css, bloques "SIDEBAR REDISEÑADO" y "SIDEBAR EN MÓVIL".
 */

import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { Avatar } from "./Avatar"
import { Logo } from "../Logo"
// Estilos del menú (cf-side__*).
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
//   icon: "fa-users"                -> icono de Font Awesome, al lado del nombre
//   group: "Equipo"                 -> título bajo el que se agrupa; sin él, va suelto arriba
//   children: [...] en vez de `to`  -> grupo desplegable; sus `roles` valen para los hijos
//   end: true (solo Inicio)         -> sin él, saldría activo en todo /dashboard
//
// "Mi cuenta" ya no está aquí: se entra por "Ajustes", en el bloque de
// usuario de abajo.
//
// Decide `roles`, no el orden: los comentarios por rol son solo para leer.
// El orden de arriba abajo es el de la lista: los enlaces de un mismo
// grupo tienen que ir seguidos.

import { AffectedCount } from "./AffectedCount";

const LINKS = [
    // --- Comunes a todos los roles (sin grupo: van sueltos arriba) ---
    { to: "/dashboard", label: "Inicio", icon: "fa-house", roles: ["client", "worker", "manager"], end: true },

    // --- Solo CLIENT ---
    { to: "/dashboard/service-catalog", label: "Catálogo de servicios", icon: "fa-list", group: "Servicios", roles: ["client"] },
    { to: "/dashboard/contracted-services", label: "Mis servicios", icon: "fa-calendar-check", group: "Servicios", roles: ["client"] },

    // --- Solo WORKER ---
    { to: "/dashboard/tasks", label: "Mis tareas", icon: "fa-clipboard-check", group: "Mi trabajo", roles: ["worker"] },

    // --- Solo MANAGER ---
    { to: "/dashboard/affected-bookings", label: "Reservas afectadas", icon: "fa-triangle-exclamation", group: "Operativa", roles: ["manager"], affected: true },
    { to: "/dashboard/workers", label: "Trabajadores", icon: "fa-users", group: "Equipo", roles: ["manager"] },
    { to: "/dashboard/shifts", label: "Turnos", icon: "fa-clock", group: "Equipo", roles: ["manager"] },
    {
        label: "Administrar catálogo",
        icon: "fa-broom",
        group: "Catálogo",
        roles: ["manager"],
        children: [
            { to: "/dashboard/services-catalog", label: "Servicios" },
            { to: "/dashboard/tasks-catalog", label: "Tareas de servicios" },
        ],
    },
]

// Mismo corte que el bloque "SIDEBAR EN MÓVIL" de dashboard.css.
const MOBILE_QUERY = "(max-width: 767.98px)"

// En qué panel estás, bajo el bloque de usuario.
const PANEL_LABEL = {
    client: "Panel del cliente",
    worker: "Panel del trabajador",
    manager: "Panel del encargado",
}

// Las dos opciones del tema, para el menú desplegado.
const THEMES = [
    { value: "light", label: "Claro", icon: "fa-sun" },
    { value: "dark", label: "Oscuro", icon: "fa-moon" },
]

// Dónde se guarda si el menú quedó plegado. Es una preferencia de este
// navegador, no del usuario: no tiene sentido llevarla al servidor.
const COLLAPSED_KEY = "cleanflow:sidebar-collapsed"

// Por debajo de 1024px el menú desplegado se come la página: si nunca se
// ha elegido nada en este navegador, arranca plegado.
const TABLET_QUERY = "(max-width: 1023.98px)"

// localStorage puede fallar (ventana privada, permisos) y no vale la pena
// romper el menú por eso: ante la duda, desplegado.
const readCollapsed = () => {
    try {
        const saved = window.localStorage.getItem(COLLAPSED_KEY)

        // Sin nada guardado manda el tamaño de la pantalla; si el usuario ya
        // eligió, se respeta su elección.
        if (saved === null) return window.matchMedia(TABLET_QUERY).matches

        return saved === "true"
    } catch {
        return false
    }
}

// El tema elegido, guardado en este navegador. Cuando exista el modo
// oscuro de todo el panel, esta misma clave la leerá el marco.
const THEME_KEY = "cleanflow:theme"

const readTheme = () => {
    try {
        return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"
    } catch {
        return "light"
    }
}

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
    // PLEGAR EL MENÚ (ESCRITORIO Y TABLET)
    // ----------------------------------------------------------------------
    // Plegado se queda en una barra de iconos: se sigue viendo dónde estás y
    // se llega a cualquier sección en un clic. En móvil no actúa: allí el
    // menú es un cajón que se abre y se cierra entero.

    // La función va sin paréntesis: así localStorage se lee una vez, al
    // montar, y no en cada render.
    const [collapsed, setCollapsed] = useState(readCollapsed)

    useEffect(() => {
        try {
            window.localStorage.setItem(COLLAPSED_KEY, String(collapsed))
        } catch {
            // Sin guardado: el menú funciona igual, solo que no se recuerda.
        }
    }, [collapsed])

    // ----------------------------------------------------------------------
    // TEMA CLARO U OSCURO
    // ----------------------------------------------------------------------
    // De momento solo cambia el menú: llevarlo a todas las pantallas del
    // panel es su propia issue. El interruptor se deja puesto y funcionando
    // para no tener que rehacer el pie después.

    // Sin paréntesis: se lee una vez, al montar.
    const [theme, setTheme] = useState(readTheme)
    const dark = theme === "dark"

    useEffect(() => {
        try {
            window.localStorage.setItem(THEME_KEY, theme)
        } catch {
            // Sin guardado: el interruptor funciona, solo que no se recuerda.
        }
    }, [theme])

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
    // PANTALLA
    // ----------------------------------------------------------------------
    // Tres reglas al tocar el diseño:
    //   1. Recorrer `visibleLinks`, nunca LINKS.
    //   2. Usar <NavLink> (no <a>): navega sin recargar y pone aria-current
    //      en la página actual, que es de lo que tira el CSS.
    //   3. Mantener la lógica de cerrar sesión.

    // Título del grupo, solo cuando cambia respecto al enlace anterior.
    const groupTitle = (link, index) => {
        const previous = visibleLinks[index - 1]

        if (!link.group || link.group === previous?.group) return null

        return <p className="cf-side__eyebrow">{link.group}</p>
    }

    return (
        <>
            {/* Solo en móvil: barra superior con la hamburguesa a la derecha.
                En tablet y escritorio, dashboard.css la oculta. */}
            <header className="cf-side-topbar">
                <Link to="/dashboard" className="cf-side-topbar__brand" onClick={closeMenu}>
                    <span className="cf-side__logo">
                        <Logo size={28} />
                    </span>
                    <span className="cf-side__name">
                        <b>CLEAN</b>
                        <span>FLOW</span>
                    </span>
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

            <aside
                id="dashboard-sidebar"
                className={"cf-side" + (collapsed ? " cf-side--rail" : "") + (menuOpen ? " cf-side--open" : "")}
                data-theme={theme}
                aria-label="Menú del panel"
            >
                {/* Plegar y desplegar. aria-expanded dice si el menú está
                    abierto; la flecha gira con CSS. */}
                <button
                    type="button"
                    className="cf-side__collapse"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-controls="dashboard-sidebar"
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? "Desplegar el menú" : "Plegar el menú"}
                >
                    <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                </button>

                {/* Marca: el isotipo y el logotipo de la web. */}
                <Link to="/dashboard" className="cf-side__brand" onClick={closeMenu}>
                    <span className="cf-side__logo">
                        <Logo size={34} />
                    </span>
                    <span className="cf-side__name">
                        <b>CLEAN</b>
                        <span>FLOW</span>
                    </span>
                </Link>

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

                <nav className="cf-side__nav" aria-label="Secciones">
                    {/* key: la URL, o el nombre en los grupos (no tienen URL).
                        onClick={closeMenu}: en móvil, elegir un enlace cierra el panel. */}
                    {visibleLinks.map((link, index) => {
                        if (!link.children) {
                            return (
                                <div key={link.to}>
                                    {groupTitle(link, index)}

                                    <NavLink to={link.to} end={link.end} className="cf-side__link" onClick={closeMenu}>
                                        <i className={`fa-solid ${link.icon}`} aria-hidden="true" />
                                        <span>{link.label}</span>
                                        {link.affected && <AffectedCount token={store.token} pathname={pathname} />}
                                        {/* Plegado, el nombre sale al pasar por encima. */}
                                        <span className="cf-side__tip">{link.label}</span>
                                    </NavLink>
                                </div>
                            )
                        }

                        // Grupo: <button> y no enlace, porque no navega; solo abre y cierra.
                        const open = isGroupOpen(link)
                        const groupId = `sidebar-group-${index}`

                        return (
                            <div key={link.label}>
                                {groupTitle(link, index)}

                                <button
                                    type="button"
                                    className="cf-side__link"
                                    onClick={() => toggleGroup(link)}
                                    aria-expanded={open}
                                    aria-controls={groupId}
                                    // Cerrado con la página actual dentro: se marca igual que una sección activa.
                                    aria-current={!open && isGroupCurrent(link) ? "page" : undefined}
                                >
                                    <i className={`fa-solid ${link.icon}`} aria-hidden="true" />
                                    <span>{link.label}</span>
                                    <i className="fa-solid fa-chevron-down cf-side__chevron" aria-hidden="true" />
                                    <span className="cf-side__tip">{link.label}</span>
                                </button>

                                <div id={groupId} className="cf-side__sub" hidden={!open}>
                                    {link.children.map(child => (
                                        <NavLink
                                            key={child.to}
                                            to={child.to}
                                            className="cf-side__link"
                                            onClick={closeMenu}
                                        >
                                            <span>{child.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </nav>

                {/* BLOQUE DE USUARIO (#13): en qué panel estás, quién ha
                    entrado, sus ajustes y salir. El avatar y el nombre cambian
                    solos al guardar en Ajustes, porque esas pantallas
                    despachan SET_USER. */}
                <div className="cf-side__foot">
                    {/* Desplegado: las dos opciones a la vista. role="group"
                        y aria-pressed: comparten una elección, no navegan. */}
                    <div className="cf-side__theme" role="group" aria-label="Tema del panel">
                        {THEMES.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setTheme(option.value)}
                                aria-pressed={theme === option.value}
                            >
                                <i className={`fa-solid ${option.icon}`} aria-hidden="true" />
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Plegado: el mismo tema, en un interruptor. Se pulse
                        donde se pulse, cambia. role="switch" + aria-checked
                        es lo que anuncia un interruptor a un lector de
                        pantalla. El CSS enseña uno u otro, nunca los dos. */}
                    <button
                        type="button"
                        className="cf-side__theme-switch"
                        onClick={() => setTheme(dark ? "light" : "dark")}
                        role="switch"
                        aria-checked={dark}
                        aria-label="Modo oscuro"
                    >
                        <span className="cf-side__theme-track" aria-hidden="true">
                            <i className="fa-solid fa-sun" />
                            <i className="fa-solid fa-moon" />
                            <span className="cf-side__theme-knob" />
                        </span>

                        <span className="cf-side__tip">{dark ? "Modo claro" : "Modo oscuro"}</span>
                    </button>

                    <p className="cf-side__paneltag">{PANEL_LABEL[role]}</p>

                    <div className="cf-side__user">
                        <Avatar user={store.user} size="md" />

                        {/* Cada línea se recorta: el bloque mide igual con
                            cualquier nombre y con cualquier correo. */}
                        <div className="cf-side__who">
                            <span className="cf-side__username">{fullName}</span>
                            <span className="cf-side__mail">{store.user?.email}</span>
                        </div>

                        <span className="cf-side__tip">{fullName}</span>
                    </div>

                    <div className="cf-side__actions">
                        <NavLink to="/dashboard/profile" className="cf-side__action" onClick={closeMenu}>
                            <i className="fa-solid fa-gear" aria-hidden="true" />
                            <span>Ajustes</span>
                            <span className="cf-side__tip">Ajustes</span>
                        </NavLink>

                        {/* <button> y no <a href="#">: cerrar sesión es una acción, no una navegación. */}
                        <button
                            type="button"
                            className="cf-side__action cf-side__action--exit"
                            onClick={handleLogout}
                        >
                            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
                            <span>Salir</span>
                            <span className="cf-side__tip">Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    )
};
