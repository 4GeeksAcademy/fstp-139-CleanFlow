/**
 * Cabecera de la web pública.
 *
 * Estructura: dos filas.
 *   - Fila superior: los accesos al área privada.
 *   - Fila principal: el logo, el botón de menú y la navegación.
 *
 * Los estilos son las clases cf-* de web.css.
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "../Logo";
import { ServicesDropdown } from "./ServicesDropdown";
import { useActiveSection } from "../../hooks/useActiveSection";


const ACCESS_LINKS = [
    { label: "Área de clientes", to: "/login-clients" },
    { label: "Área de empleados", to: "/login-workers" },
]


const NAV_LINKS = [
    { label: "Inicio", to: "/", section: "hero" },
    { label: "Servicios", to: "/#services", section: "services", dropdown: true },
    { label: "Sobre CleanFlow", to: "/#about-us", section: "about-us" },
    { label: "Contacto", to: "/contact", section: null },
]


const SECTION_IDS = NAV_LINKS
    .map((link) => link.section)
    .filter(Boolean);


export const Navbar = () => {

    const { pathname, hash } = useLocation();
    const activeSection = useActiveSection(SECTION_IDS);
    const [menuOpen, setMenuOpen] = useState(false);


    // Cierra el menú al navegar. Se mira la ubicación en vez de poner un
    // onClick en cada enlace: así también se cierra al elegir un servicio
    // del desplegable, sin pasarle nada a ese componente.
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname, hash]);


    // Escape cierra el menú. Se escucha en todo el documento porque el
    // foco puede estar en cualquier parte cuando se pulsa.
    useEffect(() => {
        if (!menuOpen) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") setMenuOpen(false);
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [menuOpen]);


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
            <nav aria-label="Navegación principal">
                <div className="cf-container cf-navbar">

                    <Link to="/" className="cf-brand">
                        <Logo size={36} />
                        <span className="cf-brand__name"><b>CLEAN</b><span>FLOW</span></span>
                    </Link>

                    {/* El icono es decorativo, así que se oculta a los
                        lectores de pantalla y el nombre del botón viaja en
                        aria-label. Sin él, el botón no tendría nombre. */}
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
                            link.dropdown ? (
                                <ServicesDropdown
                                    key={link.to}
                                    to={link.to}
                                    label={link.label}
                                    active={isActive(link)}
                                />
                            ) : (
                                <li key={link.to}>
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