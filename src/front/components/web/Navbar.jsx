/**
 * NAVBAR DE LA WEB.
 *
 * Dos filas:
 *   - Superior: los accesos al área privada.
 *   - Principal: la marca, el botón de menú y la navegación.
 *
 * Estilos: clases `cf-*` en web.css.
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "../Logo";
import { ServicesDropdown } from "./ServicesDropdown";
import { useActiveSection } from "../../hooks/useActiveSection";


// Las dos puertas de acceso. Ambas llevan al mismo formulario: solo
// cambia lo que se le ofrece a quien todavía no tiene cuenta.
// Estas rutas aún no existen (WEB-10).
const ACCESS_LINKS = [
    { label: "Área de clientes", to: "/login-clients" },
    { label: "Área de empleados", to: "/login-workers" },
]


// Navegación principal.
//
// Cada item tiene tres campos, y conviene no confundirlos:
//
//   to        -> adónde navega al pulsarlo.
//   section   -> qué sección de la landing lo enciende (resaltado).
//   dropdown  -> si despliega un submenú. Hoy solo "Servicios".
//
// PARA AÑADIR O CAMBIAR UN ITEM, la clave está en el `to`:
//
//   - ¿Lleva a una SECCIÓN de la landing? Va con almohadilla:
//         to: "/#about-us"      y   section: "about-us"
//     Ese id tiene que existir en una <section> de Home.jsx, o el enlace
//     no llevará a ninguna parte y no dará ningún error.
//
//   - ¿Lleva a una PÁGINA propia? Va sin almohadilla:
//         to: "/work-with-us"   y   section: null
//     Las páginas no se resaltan por scroll, sino por la URL: de ahí el
//     null.
//
// "Inicio" es la excepción que confirma la regla: navega a "/" sin ancla
// porque el hero ya está arriba del todo, pero lleva section: "hero" para
// que se marque mientras se está viendo esa primera pantalla.

const NAV_LINKS = [
    { label: "Inicio",           to: "/",             section: "hero" },
    { label: "Servicios",        to: "/#services",    section: "services", dropdown: true },
    { label: "Sobre CleanFlow",  to: "/#about-us",    section: "about-us" },
    { label: "Contacto",         to: "/#contact",     section: "contact" },
]


// Los ids a vigilar salen de los propios enlaces: al añadir un item con
// su sección, el observador se entera solo.
const SECTION_IDS = NAV_LINKS
    .map((link) => link.section)
    .filter(Boolean);


export const Navbar = () => {

    const { pathname, hash } = useLocation();
    const activeSection = useActiveSection(SECTION_IDS);

    // Solo importa en pantalla pequeña: en escritorio el CSS enseña la
    // lista siempre y este valor da igual.
    const [menuOpen, setMenuOpen] = useState(false);


    // Cierra el menú al navegar. Mirando la ubicación en vez de poner un
    // onClick en cada enlace, se cierra también al elegir un servicio del
    // desplegable, sin pasarle nada a ese componente.
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname, hash]);


    // Escape cierra el menú. Se escucha en todo el documento porque el
    // foco puede estar en cualquier parte al pulsarlo.
    useEffect(() => {
        if (!menuOpen) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") setMenuOpen(false);
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [menuOpen]);


    // Un item se marca por uno de dos motivos, según su tipo:
    //   con section -> cuando esa sección es la que se está viendo.
    //   sin section -> cuando la URL coincide (el caso de una página).
    //
    // Se calcula a mano porque <NavLink> ignora el "#": marcaría a la vez
    // Inicio, Servicios y Sobre CleanFlow, que apuntan los tres a "/".
    const isActive = (link) => {
        if (link.section) return pathname === "/" && activeSection === link.section;
        return pathname === link.to;
    };


    return (
        <header className="cf-header">

            {/* ---------- FILA SUPERIOR: ACCESOS ---------- */}
            <nav className="cf-header__utility" aria-label="Accesos de usuario">
                <div className="cf-container">
                    <ul className="cf-utility-list">
                        {ACCESS_LINKS.map((link) => (
                            <li key={link.to}>
                                <Link to={link.to}>{link.label}</Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </nav>

            {/* ---------- FILA PRINCIPAL: MARCA Y NAVEGACIÓN ---------- */}
            {/* Cada <nav> lleva su aria-label: sin ellos, un lector de
                pantalla anuncia "navegación" dos veces sin distinguirlas. */}
            <nav aria-label="Navegación principal">
                <div className="cf-container cf-navbar">

                    <Link to="/" className="cf-brand">
                        <Logo size={36} />
                        <span className="cf-brand__name"><b>CLEAN</b><span>FLOW</span></span>
                    </Link>

                    {/* Botón de menú, solo visible en móvil.
                        aria-controls dice QUÉ abre y aria-expanded si está
                        abierto. El icono es decorativo, así que el nombre
                        del botón viaja en aria-label. */}
                    <button
                        type="button"
                        className="cf-nav-toggle"
                        aria-controls="main-menu"
                        aria-expanded={menuOpen}
                        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                        onClick={() => setMenuOpen((abierto) => !abierto)}
                    >
                        <i
                            className={menuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"}
                            aria-hidden="true"
                        ></i>
                    </button>

                    <ul
                        id="main-menu"
                        className={menuOpen ? "cf-nav is-open" : "cf-nav"}
                    >
                        {NAV_LINKS.map((link) => (
                            // El item con desplegable pinta su propio <li>:
                            // necesita estado y eventos propios.
                            link.dropdown ? (
                                <ServicesDropdown
                                    key={link.to}
                                    to={link.to}
                                    label={link.label}
                                    active={isActive(link)}
                                />
                            ) : (
                                <li key={link.to}>
                                    {/* Dos marcas y las dos hacen falta: la clase
                                        para el CSS, aria-current para quien usa
                                        lector de pantalla (un color no le dice nada). */}
                                    <Link
                                        to={link.to}
                                        className={
                                            isActive(link)
                                                ? "cf-nav__link is-active"
                                                : "cf-nav__link"
                                        }
                                        aria-current={isActive(link) ? "page" : undefined}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            )
                        ))}
                    </ul>

                </div>
            </nav>

        </header>
    )
}
