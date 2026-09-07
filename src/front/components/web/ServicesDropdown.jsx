import { useEffect, useRef, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { Link } from "react-router-dom"


export const ServicesDropdown = ({ to, label, active }) => {
    
    const { store } = useGlobalReducer();
    const services = store.services;

    const [open, setOpen ] = useState(false);
    const container = useRef(null);

    useEffect(() => {
        
        if(!open) return;

        const onClickOutside = (e) => {
            if (container.current && !container.current.contains(e.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", onClickOutside)

        return () => document.removeEventListener("mousedown", onClickOutside);

    }, [open]);

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
            {/* onFocus va aquí y no en el <li>: si estuviera arriba,
                burbujearía desde el botón de abajo y al tocarlo se abriría
                y se cerraría a la vez. */}
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

            {/* En una pantalla táctil no existe el "pasar por encima": al
                tocar el enlace, navegas. Este botón da la otra opción. */}
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

            {open && (
                <ul className="cf-dropdown__panel">
                    {services.length === 0 ? (
                        <li className="cf-dropdown__empty">
                            Aún no hay servicios disponibles
                        </li>
                    ) : (
                        services.map((service) => (
                            <li key={service.slug}>
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