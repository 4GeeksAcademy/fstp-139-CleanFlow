/**
 * DESPLEGABLE DE SERVICIOS DEL NAVBAR.
 *
 * Lee la lista del store: no pide nada al backend. Por eso un servicio
 * que el encargado activa aparece aquí solo, sin tocar código.
 *
 *   Abre:   ratón encima, foco en el enlace, botón (táctil).
 *   Cierra: ratón fuera, foco fuera, Escape, clic fuera.
 *
 * Estilos: clases `cf-dropdown*` en web.css.
 */

import { useEffect, useRef, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { Link } from "react-router-dom"


export const ServicesDropdown = ({ to, label, active }) => {

    const { store } = useGlobalReducer();
    const services = store.services;

    const [open, setOpen ] = useState(false);

    // Referencia al <li>, para saber si un clic cayó dentro o fuera.
    const container = useRef(null);

    // Cerrar al hacer clic fuera. Es lo único que no se puede resolver con
    // eventos del propio elemento: el clic ocurre en otra parte.
    useEffect(() => {

        // Cerrado no hay nada que vigilar: el escuchador solo existe
        // mientras hace falta.
        if(!open) return;

        const onClickOutside = (e) => {
            if (container.current && !container.current.contains(e.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", onClickOutside)

        // Sin esta limpieza, cada apertura dejaría un escuchador vivo.
        return () => document.removeEventListener("mousedown", onClickOutside);

    }, [open]);

    // relatedTarget es quien RECIBE el foco. Si sigue dentro del <li>, es
    // que se está tabulando entre los servicios: no hay que cerrar.
    const onFocusLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setOpen(false);
        }
    }

    const onKeyDown = (e) => {
        if (e.key === "Escape") setOpen(false);
    }

    return (
        <li
            ref={container}
            className="cf-dropdown"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onBlur={onFocusLeave}
            onKeyDown={onKeyDown}
        >
            {/* onFocus va aquí y no en el <li>: arriba burbujearía desde el
                botón y al tocarlo se abriría y cerraría a la vez. */}
            <Link
                to={to}
                className={active ? "cf-nav__link is-active" : "cf-nav__link"}
                onFocus={() => setOpen(true)}
                aria-expanded={open}
                aria-haspopup="true"
                aria-current={active ? "page" : undefined}
            >
                {label}
            </Link>

            {/* En táctil no existe el "pasar por encima": tocar el enlace
                navega. Este botón da la otra opción. Solo visible en móvil. */}
            <button
                type="button"
                className="cf-dropdown__toggle"
                aria-expanded={open}
                aria-label={open ? "Ocultar servicios" : "Ver servicios"}
                onClick={() => setOpen((abierto) => !abierto)}
            >
                <i
                    className={open ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"}
                    aria-hidden="true"
                ></i>
            </button>

            {/* El panel existe solo mientras está abierto. Ocultarlo con CSS
                dejaría sus enlaces alcanzables con el tabulador. */}
            {open && (
                <ul className="cf-dropdown__panel">
                    {services.length === 0 ? (
                        <li className="cf-dropdown__empty">
                            Aún no hay servicios disponibles
                        </li>
                    ) : (
                        services.map((service) => (
                            <li key={service.slug}>
                                {/* Cierra al elegir, o el menú taparía la
                                    ficha del servicio recién abierta. */}
                                <Link
                                    to={`/services/${service.slug}`}
                                    onClick={() => setOpen(false)}
                                >
                                    {service.name}
                                </Link>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </li>
    );
};
