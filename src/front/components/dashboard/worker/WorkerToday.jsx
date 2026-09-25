/**
 * EL DÍA QUE SE ESTÁ TRABAJANDO.
 *
 * El bloque verde de arriba: si el servicio está en marcha dice desde
 * qué hora, y si aún no se ha empezado, a qué hora toca. En un servicio
 * de varios días avisa de lo que queda para mañana.
 *
 * Solo informa. Los botones de empezar y cerrar el día van aparte.
 *
 * Estilos: dashboard.css, sección 10 (cf-wtoday).
 */

import { timeOf, longDate } from "../bookings/bookingFormat";

/** El tramo de hoy, si lo hay. Es el único que se puede trabajar. */
export const dayOfToday = (booking, today) =>
    booking.days.find((day) => day.starts_at.slice(0, 10) === today) || null;

/** Los tramos que quedan después de hoy. */
const daysAhead = (booking, today) =>
    booking.days.filter((day) => day.starts_at.slice(0, 10) > today);

export const WorkerToday = ({ booking, today }) => {
    const day = dayOfToday(booking, today);

    // Sin tramo hoy no hay nada que contar: o ya pasó, o toca otro día.
    if (!day) return null;

    const ahead = daysAhead(booking, today);
    const [next] = ahead;

    const note = day.finished_at
        ? ahead.length > 0
            ? `Día cerrado. El siguiente es el ${longDate(next.starts_at).toLowerCase()}.`
            : "Día cerrado."
        : ahead.length > 0
            ? `Cuando termines hoy, te quedan ${ahead.length} ${ahead.length === 1 ? "día" : "días"} más.`
            : "Es el último día del servicio.";

    return (
        <div className="cf-wtoday">
            <p className="cf-wtoday__when">
                <i className="fa-regular fa-clock" aria-hidden="true"></i>
                {day.started_at
                    ? `Empezaste a las ${timeOf(day.started_at)}`
                    : `Hoy, de ${timeOf(day.starts_at)} a ${timeOf(day.ends_at)}`}
            </p>

            <p className="cf-wtoday__note">{note}</p>
        </div>
    );
};
