/**
 * FOOTER DE LA WEB
 *
 * Cuatro columnas (marca, navegación, servicios y contacto) y 
 * la línea legal centrada.
 *
 * Los servicios salen del store, la misma fuente que el desplegable del
 * navbar: así los dos enseñan siempre lo mismo.
 *
 * Estilos: clases `cf-footer*` en web.css.
 */

import { Fragment } from "react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { Logo } from "../Logo";
import { COMPANY, SOCIAL_NETWORKS } from "../../data/company";


// Enlaces del footer.
const FOOTER_LINKS = [
    { label: "Inicio", to: "/" },
    { label: "Servicios", to: "/#services" },
    { label: "Sobre CleanFlow", to: "/#about-us" },
    { label: "Contacto", to: "/#contact" },
    { label: "Trabaja con nosotros", to: "/work-with-us" },
]

// Páginas legales. Todavía no existen: pendiente de redactarlas.
const LEGAL_LINKS = [
    { label: "Política de privacidad", to: "/privacy" },
    { label: "Política de cookies", to: "/cookies" },
    { label: "Aviso legal", to: "/legal" },
]


export const Footer = () => {

    const { store } = useGlobalReducer();
    const services = store.services;

    // Solo las redes con perfil creado: un icono que no lleva a ninguna
    // parte queda peor que no tener icono.
    const activeNetworks = SOCIAL_NETWORKS.filter((network) => network.url);

    return (
        <footer className="cf-footer">
            {/* Marco del color del fondo + panel verde encajado dentro. */}
            <div className="cf-footer__frame">
                <div className="cf-footer__panel">

                    <div className="cf-container">
                        <div className="cf-footer__grid">

                            {/* ---------- MARCA ---------- */}
                            <div>
                                {/* aria-label: necesario para que los lectores de 
                                pantalla indiquen el destino del enlace, ya que el icono 
                                es meramente decorativo. */}
                                <Link
                                    to="/"
                                    className="cf-footer__brand"
                                    aria-label="CleanFlow, volver al inicio"
                                >
                                    <Logo size={34} />
                                    <span className="cf-footer__word">
                                        <b>CLEAN</b><span>FLOW</span>
                                    </span>
                                </Link>

                                <p className="cf-footer__pitch">{COMPANY.tagline}</p>

                                {activeNetworks.length > 0 && (
                                    <ul className="cf-footer__social">
                                        {activeNetworks.map((network) => (
                                            <li key={network.name}>
                                                {/* <a> y no <Link>: son webs externas.
                                                    rel="noreferrer" impide que la página
                                                    destino manipule la nuestra. */}
                                                <a
                                                    href={network.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    aria-label={network.name}
                                                >
                                                    <i className={network.icon} aria-hidden="true"></i>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* ---------- NAVEGACIÓN ---------- */}
                            <nav aria-label="Enlaces del pie">
                                <h2 className="cf-footer__title">Navegación</h2>
                                <ul className="cf-footer__list">
                                    {FOOTER_LINKS.map((link) => (
                                        <li key={link.to}>
                                            <Link to={link.to}>{link.label}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </nav>

                            {/* ---------- SERVICIOS ---------- */}
                            <div>
                                <h2 className="cf-footer__title">Servicios</h2>
                                {services.length === 0 ? (
                                    <p className="cf-footer__empty">
                                        Aún no hay servicios disponibles
                                    </p>
                                ) : (
                                    <ul className="cf-footer__list">
                                        {services.map((service) => (
                                            <li key={service.slug}>
                                                <Link to={`/services/${service.slug}`}>
                                                    {service.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* ---------- CONTACTO ----------
                                Aquí manda la etiqueta y el dato va apagado: lo que
                                ordena esta columna es saber qué es cada cosa. En las
                                otras dos, lo importante son los enlaces. */}
                            <div>
                                <h2 className="cf-footer__title">Contacto</h2>

                                {/* <address>: la etiqueta propia de los datos de
                                    contacto de quien publica la página. */}
                                <address className="cf-footer__address">
                                    <ul className="cf-footer__data">

                                        {/* tel: y mailto: para que en móvil se pueda
                                            llamar y escribir con un toque. */}
                                        <li>
                                            <span className="cf-footer__label">Teléfono</span>
                                            <span className="cf-footer__value">
                                                <a href={`tel:${COMPANY.phoneLink}`}>
                                                    {COMPANY.phone}
                                                </a>
                                            </span>
                                        </li>

                                        <li>
                                            <span className="cf-footer__label">Email</span>
                                            <span className="cf-footer__value">
                                                <a href={`mailto:${COMPANY.email}`}>
                                                    {COMPANY.email}
                                                </a>
                                            </span>
                                        </li>

                                        <li>
                                            <span className="cf-footer__label">Dirección</span>
                                            <span className="cf-footer__value">
                                                <span>{COMPANY.street}</span>
                                                <span>{COMPANY.city}</span>
                                            </span>
                                        </li>

                                        <li>
                                            <span className="cf-footer__label">Horario</span>
                                            <span className="cf-footer__value">
                                                {COMPANY.schedule.map((line) => (
                                                    <span key={line}>{line}</span>
                                                ))}
                                            </span>
                                        </li>

                                    </ul>
                                </address>
                            </div>

                        </div>
                    </div>

                    {/* ---------- MARCA GRANDE ----------
                        En SVG y no como texto: el viewBox hace que la palabra ocupe
                        el ancho disponible, entera y centrada, en cualquier pantalla.

                        La línea base (y=185) cae fuera del viewBox, que acaba en 152:
                        por eso las letras salen recortadas por abajo.

                        textLength la obliga a medir 950 de los 1000 de ancho, así que
                        nunca se sale por los lados. */}
                    <svg
                        className="cf-footer__mark"
                        viewBox="0 60 1000 92"
                        role="img"
                        aria-label="CleanFlow"
                    >
                        <text
                            x="500"
                            y="185"
                            textAnchor="middle"
                            fontSize="170"
                            textLength="950"
                            lengthAdjust="spacingAndGlyphs"
                        >
                            CleanFlow
                        </text>
                    </svg>

                </div>

                {/* ---------- LÍNEA LEGAL ----------
                    Centrada porque los widgets de chat se anclan abajo a la
                    derecha y taparían el aviso legal justo en esa esquina. */}
                <div className="cf-footer__legal">
                    {/* getFullYear: el año se actualiza solo. */}
                    <p>© {new Date().getFullYear()} {COMPANY.name}</p>

                    {LEGAL_LINKS.map((link) => (
                        // Fragment porque cada enlace son dos elementos
                        // (separador + enlace) y la key va en el de fuera.
                        <Fragment key={link.to}>
                            <span className="cf-footer__sep" aria-hidden="true">·</span>
                            <Link to={link.to}>{link.label}</Link>
                        </Fragment>
                    ))}
                </div>

            </div>
        </footer>
    )
}
