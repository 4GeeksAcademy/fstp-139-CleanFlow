/**
 * TARJETA DE UN SERVICIO ASIGNADO.
 *
 * Una fila del listado del trabajador: cuándo, qué, dónde, en qué punto
 * está y cuántas tareas lleva. La tarjeta entera abre el detalle, con el
 * ratón y con el teclado.
 *
 * Solo pinta: recibe el servicio ya cargado y avisa con onOpen.
 *
 * Estilos: dashboard.css, sección 10 (cf-wcard).
 */

import { dayOf, monthOf, timeOf } from "../bookings/bookingFormat";
import { WorkerStatus } from "./WorkerStatus";
import { WorkerProgress } from "./WorkerProgress";

/** "Alcalá, 118": lo justo para reconocer la casa de un vistazo. */
const shortAddress = (address) =>
    address ? `${address.street}, ${address.number}` : "Sin dirección";

export const WorkerBookingCard = ({ booking, today, onOpen }) => {
    const [first] = booking.days;

    // Toda reserva nace con al menos un tramo, pero si alguna llegara sin
    // ellos la tarjeta reventaría y se llevaría la lista entera por
    // delante. Mejor no pintarla y que el resto se vea.
    if (!first) return null;

    const moreDays = booking.days.length - 1;

    // El de hoy se distingue con el borde y con "HOY" en lugar del mes:
    // es el único que se puede empezar.
    const isToday = first.starts_at.slice(0, 10) === today;

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
                className={`cf-wcard${isToday ? " cf-wcard--today" : ""}`}
                role="link"
                tabIndex={0}
                onClick={() => onOpen?.(booking)}
                onKeyDown={handleKeyDown}
            >
                <div className="cf-wcard__date">
                    <span className="cf-wcard__day">{dayOf(first.starts_at)}</span>
                    <span className="cf-wcard__month">
                        {isToday ? "hoy" : monthOf(first.starts_at)}
                    </span>
                </div>

                <div>
                    <h2 className="cf-wcard__service">
                        {booking.service?.name || "Servicio no disponible"}
                    </h2>

                    <p className="cf-wcard__meta">
                        <span>
                            <i className="fa-regular fa-clock" aria-hidden="true"></i>
                            {timeOf(first.starts_at)} – {timeOf(first.ends_at)}
                        </span>

                        <span>
                            <i className="fa-solid fa-location-dot" aria-hidden="true"></i>
                            {shortAddress(booking.address)}
                        </span>

                        {/* Solo si dura varios días: lo normal es uno. */}
                        {moreDays > 0 && (
                            <span>+{moreDays} {moreDays === 1 ? "día" : "días"}</span>
                        )}
                    </p>
                </div>

                <div className="cf-wcard__foot">
                    <WorkerStatus status={booking.status} />
                    <WorkerProgress tasks={booking.tasks} />
                </div>
            </article>
        </li>
    );
};
