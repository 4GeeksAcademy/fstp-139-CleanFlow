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

import { BookingStatusPill, awaitsConfirmation } from "./BookingStatusPill";
import { EUROS, dayOf, monthOf, timeOf, initialsOf, daysLeft } from "./bookingFormat";

export const BookingCard = ({ booking, onOpen }) => {
    const [first] = booking.days;
    const moreDays = booking.days.length - 1;
    const waiting = awaitsConfirmation(booking);
    const left = waiting ? daysLeft(booking.completed_at) : 0;

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

                {/* El aviso ocupa su propia fila: al lado del estado, los
                    dos competirían y no se leería ninguno. */}
                {waiting && (
                    <p className="cf-bookcard__notice">
                        <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                        Esperando tu confirmación
                        {left > 0 && ` · ${left === 1 ? "queda 1 día" : `quedan ${left} días`}`}
                    </p>
                )}
            </article>
        </li>
    );
};
