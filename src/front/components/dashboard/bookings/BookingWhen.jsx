/**
 * CUÁNDO Y DÓNDE.
 *
 * Cada día contratado con su horario y, debajo, el real si el servicio
 * ya pasó por ahí. Un servicio de varios días se empieza y se cierra
 * cada día, así que las horas reales salen del tramo y no de la reserva.
 *
 * Al final, la dirección donde se hizo.
 *
 * Estilos: dashboard.css (cf-bookday y cf-bookplace).
 */

import { longDate, timeOf } from "./bookingFormat";

/** "Calle de Alcalá, 118 · 3.º B" */
const streetOf = (address) =>
    [`${address.street}, ${address.number}`, address.floor].filter(Boolean).join(" · ");

export const BookingWhen = ({ booking }) => (
    <section className="cf-bookblock">
        <h2 className="cf-bookblock__title">Cuándo y dónde</h2>

        {booking.days.map((day) => (
            <div key={day.booking_day_id} className="cf-bookday">
                <span className="cf-bookday__when">
                    {longDate(day.starts_at)} · {timeOf(day.starts_at)} – {timeOf(day.ends_at)}
                </span>

                {/* La hora real solo aparece cuando el día ya se cerró. */}
                {day.started_at && day.finished_at && (
                    <span className="cf-bookday__real">
                        Se hizo de {timeOf(day.started_at)} a {timeOf(day.finished_at)}
                    </span>
                )}
            </div>
        ))}

        <p className="cf-bookplace">
            <i className="fa-solid fa-location-dot" aria-hidden="true"></i>
            <span>
                {streetOf(booking.address)}
                <br />
                {booking.address.postal_code} {booking.address.city}
            </span>
        </p>
    </section>
);
