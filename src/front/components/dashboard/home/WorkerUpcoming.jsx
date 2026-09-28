import { addCalendarDays } from "../../../utils/madridDate";
import { longDate, timeOf } from "../bookings/bookingFormat";
import { serviceName } from "./workerHomeData";

export const WorkerUpcoming = ({ today, future }) => (
    <section className="cf-worker-home__card cf-worker-home__upcoming" aria-labelledby="upcoming-title">
        <p className="cf-dash-eyebrow">Para organizarte</p>
        <h2 id="upcoming-title">Lo que viene</h2>
        <ul className="cf-worker-home__list">
            {Array.from({ length: 7 }, (_, index) => {
                const date = addCalendarDays(today, index + 1);
                const rows = future.filter(({ day }) => day.starts_at.slice(0, 10) === date);
                return (
                    <li key={date}>
                        <h3>{longDate(date)}</h3>
                        {rows.length === 0 ? <p className="cf-worker-home__muted">Día libre · sin servicios asignados</p>
                            : rows.map(({ key, booking, day }) => (
                                <div key={key} className="cf-worker-home__planned">
                                    <strong>{serviceName(booking)}</strong>
                                    <span>{booking.address?.city || "Zona no disponible"}</span>
                                    <span>{timeOf(day.starts_at)} – {timeOf(day.ends_at)}</span>
                                </div>
                            ))}
                    </li>
                );
            })}
        </ul>
    </section>
);
