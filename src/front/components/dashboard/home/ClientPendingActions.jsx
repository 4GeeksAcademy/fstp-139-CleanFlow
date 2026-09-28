import { Link } from "react-router-dom";

const confirmationDeadline = (completedAt) => {
    if (!completedAt) return "";

    const deadline = new Date(`${completedAt.slice(0, 10)}T12:00:00`);
    deadline.setDate(deadline.getDate() + 3);

    return new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "long",
    }).format(deadline);
};

const ActionRow = ({ booking, title, text, action, urgent = false }) => (
    <li className={`cf-client-action${urgent ? " cf-client-action--urgent" : ""}`}>
        <div className="cf-client-action__icon" aria-hidden="true">
            <i
                className={
                    urgent
                        ? "fa-regular fa-clock"
                        : "fa-regular fa-circle-check"
                }
            ></i>
        </div>

        <div className="cf-client-action__content">
            <h3>{title}</h3>
            <p>{text}</p>
        </div>

        <Link
            to={`/dashboard/contracted-services/${booking.booking_id}`}
            className="cf-dash-btn cf-dash-btn--ghost"
        >
            {action}
        </Link>
    </li>
);

export const ClientPendingActions = ({ bookings }) => {
    // Lo que caduca aparece primero porque requiere una respuesta rápida.
    const confirmations = bookings.filter(
        (booking) => booking.confirmation === "pending"
    );

    const reviews = bookings.filter(
        (booking) =>
            ["confirmed", "auto_confirmed"].includes(booking.confirmation) &&
            !booking.review
    );

    const claims = bookings.filter(
        (booking) => booking.confirmation === "in_review"
    );

    if (
        confirmations.length === 0 &&
        reviews.length === 0 &&
        claims.length === 0
    ) {
        return null;
    }

    return (
        <section className="cf-client-pending">
            <div className="cf-client-pending__header">
                <p className="cf-dash-eyebrow">Pendientes</p>
                <h2>Lo que te toca</h2>
            </div>

            <ul className="cf-client-pending__list">
                {confirmations.map((booking) => (
                    <ActionRow
                        key={`confirmation-${booking.booking_id}`}
                        booking={booking}
                        title={`Confirma cómo fue ${booking.service.name}`}
                        text={
                            booking.completed_at
                                ? `Se dará por bueno automáticamente el ${confirmationDeadline(
                                    booking.completed_at
                                )}.`
                                : "Confirma el servicio o cuéntanos si algo no fue bien."
                        }
                        action="Responder"
                        urgent
                    />
                ))}

                {reviews.map((booking) => (
                    <ActionRow
                        key={`review-${booking.booking_id}`}
                        booking={booking}
                        title={`Valora ${booking.service.name}`}
                        text="Tu opinión ayuda a mejorar el servicio y reconoce el trabajo realizado."
                        action="Valorar"
                    />
                ))}

                {claims.map((booking) => (
                    <ActionRow
                        key={`claim-${booking.booking_id}`}
                        booking={booking}
                        title={`Reclamación de ${booking.service.name}`}
                        text="Estamos revisando lo ocurrido. Puedes consultar aquí su estado."
                        action="Ver estado"
                    />
                ))}
            </ul>
        </section>
    );
};