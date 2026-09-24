/**
 * LOS DÍAS DEL SERVICIO.
 *
 * Cada tramo con su horario previsto y, debajo, el real cuando ya se ha
 * trabajado. Con un solo día apenas se mira; con varios es la referencia
 * para organizarse.
 *
 * Estilos: dashboard.css, sección 10 (cf-wday).
 */

import { longDate, timeOf } from "../bookings/bookingFormat";

export const WorkerDays = ({ booking, today }) => (
    <section className="cf-wblock">
        <h2 className="cf-wblock__title">
            {booking.days.length > 1 ? `Los ${booking.days.length} días` : "Cuándo"}
        </h2>

        {booking.days.map((day) => {
            const isToday = day.starts_at.slice(0, 10) === today;

            return (
                <div
                    key={day.booking_day_id}
                    className={`cf-wday${isToday ? " cf-wday--today" : ""}`}
                >
                    <span className="cf-wday__when">
                        {isToday ? "Hoy" : longDate(day.starts_at)}
                        {" · "}{timeOf(day.starts_at)} – {timeOf(day.ends_at)}
                    </span>

                    {/* La hora real solo cuando el día ya se cerró: a
                        medias no dice nada todavía. */}
                    {day.started_at && day.finished_at && (
                        <span className="cf-wday__real">
                            Trabajado de {timeOf(day.started_at)} a {timeOf(day.finished_at)}
                        </span>
                    )}
                </div>
            );
        })}
    </section>
);
