/**
 * Pie de la web pública.
 *
 * Estructura en dos capas: un marco del color del fondo y, encajado
 * dentro, un panel verde redondeado. La marca "CleanFlow" va en grande al
 * final del panel, en el color del marco y cortada contra su borde
 * inferior.
 *
 * La lista de servicios sale del MISMO sitio que la del desplegable del
 * navbar: el store. Por eso las dos se actualizan a la vez y no hay forma
 * de que enseñen cosas distintas.
 *
 * Los estilos son las clases cf-footer* de web.css.
 */

import { Fragment } from "react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { Logo } from "../Logo";
import { COMPANY, SOCIAL_NETWORKS } from "../../data/company";


// Los enlaces de navegación del pie. No son los mismos que los del
// navbar: aquí se añade "Trabaja con nosotros", que arriba no cabe.
const FOOTER_LINKS = [
	{ label: "Inicio", to: "/" },
	{ label: "Servicios", to: "/#services" },
	{ label: "Sobre CleanFlow", to: "/#about-us" },
	{ label: "Contacto", to: "/contact" },
	{ label: "Trabaja con nosotros", to: "/work-with-us" },
]


// Estas páginas no existen todavía y está sin decidir si se redactan.
const LEGAL_LINKS = [
	{ label: "Política de privacidad", to: "/privacy" },
	{ label: "Política de cookies", to: "/cookies" },
	{ label: "Aviso legal", to: "/legal" },
]


export const Footer = () => {

    const { store } = useGlobalReducer();
    const services = store.services;

    // Solo se pintan las redes que ya tienen perfil creado.
    const activeNetworks = SOCIAL_NETWORKS.filter((network) => network.url);

    return (
        <footer className="cf-footer">
            <div className="cf-footer__frame">

                <div className="cf-footer__panel">

                    <div className="cf-container">
                        <div className="cf-footer__grid">

                            {/* ---------- MARCA ---------- */}
                            <div>
                                {/* Mismo <Link> que el de la cabecera: navega sin
                                    recargar, y ScrollToTop sube al principio al
                                    detectar el cambio de ubicación.

                                    El aria-label hace falta porque el isotipo es
                                    decorativo: sin él, un lector de pantalla leería
                                    "CLEANFLOW" sin decir que es un enlace al inicio. */}
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

                                {/* Si no hay ningún perfil creado, no se pinta la
                                    lista. Un icono que no lleva a ninguna parte
                                    queda peor que no tener icono. */}
                                {activeNetworks.length > 0 && (
                                    <ul className="cf-footer__social">
                                        {activeNetworks.map((network) => (
                                            <li key={network.name}>
                                                {/* <a> y no <Link>: son webs de fuera.
                                                    rel="noreferrer" evita que la página
                                                    destino pueda manipular la nuestra. */}
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

                            {/* ---------- CONTACTO ---------- */}
                            <div>
                                <h2 className="cf-footer__title">Contacto</h2>

                                {/* <address> es la etiqueta pensada para los datos de
                                    contacto de quien publica la página. */}
                                {/* Aquí la jerarquía va al revés que en las columnas
                                    de enlaces: la ETIQUETA destaca y el dato queda
                                    apagado. En las otras columnas lo importante son
                                    los enlaces; en esta, saber de un vistazo qué es
                                    cada cosa. */}
                                <address className="cf-footer__address">
                                    <ul className="cf-footer__data">

                                        {/* Enlaces y no texto suelto: en un móvil,
                                            tocar el teléfono llama y tocar el correo
                                            abre el gestor de correo. */}
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

                    {/* ---------- LA MARCA GRANDE ----------
                        viewBox="0 60 1000 92": se muestra la franja que va de 60 a
                        152 en el sistema de coordenadas del dibujo. Como la línea
                        base del texto está en 185, la parte de abajo de las letras
                        cae fuera de esa franja y queda recortada. Ahí está el corte.

                        textLength + lengthAdjust obligan a la palabra a medir 950
                        de los 1000 de ancho: así entra entera, con margen a los
                        lados, en cualquier pantalla.

                        role y aria-label porque para un lector de pantalla esto es
                        una imagen con texto, no un texto normal. */}
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

                {/* ---------- LÍNEA LEGAL ---------- */}
                {/* Centrada a propósito: los widgets de chat se anclan abajo a la
                    derecha y taparían el aviso legal justo en esa esquina. */}
                <div className="cf-footer__legal">
                    {/* getFullYear para que el año no se quede antiguo solo. */}
                    <p>© {new Date().getFullYear()} {COMPANY.name}</p>

                    {LEGAL_LINKS.map((link) => (
                        // Fragment con key: hacen falta dos elementos por enlace
                        // (el separador y el enlace) y React necesita la key en
                        // el elemento de fuera.
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
