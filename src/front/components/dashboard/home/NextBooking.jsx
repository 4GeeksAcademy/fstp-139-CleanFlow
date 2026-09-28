import { Link } from "react-router-dom";

const madridDate = (date = new Date()) =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);

const dayLabel = (startsAt) => {
    const date = startsAt.slice(0, 10);
    const today = madridDate();

    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = madridDate(tomorrowDate);

    if (date === today) return "Hoy";
    if (date === tomorrow) return "Mañana";

    return new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date(`${date}T12:00:00`));
};

const addressLabel = (address) => {
    if (!address) return "Dirección pendiente";

    const floor = address.floor ? `, ${address.floor}` : "";

    return `${address.street}, ${address.number}${floor} · ${address.city}`;
};

export const NextBooking = ({ booking, day }) => {
    if (!booking || !day) {
        return (
            <section className="cf-client-next">
                <p className="cf-dash-eyebrow">Lo siguiente</p>
                <h2>No tienes ningún servicio próximo</h2>

                <p>
                    Cuando contrates uno, aquí verás cuándo irá el equipo.
                </p>

                <Link to="/dashboard/book" className="cf-dash-btn">
                    Contratar un servicio
                </Link>
            </section>
        );
    }


    return (
        <section className="cf-client-next">
            <div className="cf-client-next__intro">
                <p className="cf-dash-eyebrow">Lo siguiente</p>

                <h2>
                    {dayLabel(day.starts_at)} viene{" "}
                    {booking.worker_name || "nuestro equipo"}
                </h2>

                <p>Todo está preparado para tu próximo servicio.</p>
            </div>

            <article className="cf-client-next__card">
                <div className="cf-client-next__date">
                    <strong>{dayLabel(day.starts_at)}</strong>

                    <span>
                        {day.starts_at.slice(11, 16)}–
                        {day.ends_at.slice(11, 16)}
                    </span>
                </div>

                <div className="cf-client-next__details">
                    <h3>{booking.service.name}</h3>

                    <p>
                        <i
                            className="fa-solid fa-location-dot"
                            aria-hidden="true"
                        ></i>
                        {addressLabel(booking.address)}
                    </p>

                    <p>
                        <i
                            className="fa-regular fa-user"
                            aria-hidden="true"
                        ></i>
                        {booking.worker_name || "Trabajador por asignar"}
                    </p>
                </div>

                <Link
                    to={`/dashboard/contracted-services/${booking.booking_id}`}
                    className="cf-dash-btn cf-dash-btn--ghost"
                >
                    Ver reserva
                </Link>
            </article>
        </section>
    );
};