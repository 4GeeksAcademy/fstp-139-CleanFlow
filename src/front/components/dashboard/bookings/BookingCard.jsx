/**
 * TARJETA DE UN SERVICIO CONTRATADO.
 *
 * Una fila del listado del cliente: fecha, servicio, estado y precio. La
 * tarjeta entera es el enlace al detalle, así que funciona con el ratón
 * y con el teclado.
 *
 * Solo pinta: recibe la reserva ya cargada y avisa con onOpen.
 *
 * Estilos: dashboard.css (cf-bookcard).
 */

import { BookingStatusPill } from "./BookingStatusPill";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun",
                "jul", "ago", "sep", "oct", "nov", "dic"];

// Las fechas llegan en hora de Madrid y sin zona ("2026-09-24T08:00:00").
// Se recortan a mano: convertirlas a Date las movería al huso del navegador.
const dayOf = (isoDate) => isoDate.slice(8, 10);
const monthOf = (isoDate) => MONTHS[Number(isoDate.slice(5, 7)) - 1];
const timeOf = (isoDate) => isoDate.slice(11, 16);

const EUROS = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

// "Ana G." -> "AG". Sirve mientras no haya foto del trabajador.
const initialsOf = (name) =>
    (name || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");

export const BookingCard = ({ booking, onOpen }) => {
    const [first] = booking.days;
    const moreDays = booking.days.length - 1;

    // Enter y Espacio abren el detalle: la tarjeta es un enlace, y un
    // enlace tiene que responder al teclado como tal.
    const handleKeyDown = (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        onOpen?.(booking);
    };

    return (
        <li>
            <article
                className="cf-bookcard"
                role="link"
                tabIndex={0}
                onClick={() => onOpen?.(booking)}
                onKeyDown={handleKeyDown}
            >
                <div className="cf-bookcard__date">
                    <span className="cf-bookcard__day">{dayOf(first.starts_at)}</span>
                    <span className="cf-bookcard__month">{monthOf(first.starts_at)}</span>
                </div>

                <div className="cf-bookcard__main">
                    <h2 className="cf-bookcard__service">
                        {booking.service?.name || "Servicio no disponible"}
                    </h2>

                    <p className="cf-bookcard__meta">
                        <span>
                            <i className="fa-regular fa-clock" aria-hidden="true"></i>
                            {timeOf(first.starts_at)} – {timeOf(first.ends_at)}
                        </span>

                        {/* Solo si el servicio dura varios días: lo normal es uno. */}
                        {moreDays > 0 && (
                            <span>+{moreDays} {moreDays === 1 ? "día" : "días"}</span>
                        )}

                        <span>
                            <span className="cf-bookcard__worker" aria-hidden="true">
                                {initialsOf(booking.worker_name)}
                            </span>
                            {booking.worker_name || "Sin asignar"}
                        </span>
                    </p>
                </div>

                <div className="cf-bookcard__side">
                    <BookingStatusPill status={booking.status} />
                    <span className="cf-bookcard__price">
                        {EUROS.format(booking.total_price)}
                    </span>
                </div>
            </article>
        </li>
    );
};
