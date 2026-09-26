/**
 * LÍNEA DE TIEMPO DEL SERVICIO.
 *
 * El camino de la reserva, hito a hito y con las horas reales:
 *
 *   confirmada -> en curso -> finalizada -> confirmada por el cliente
 *
 * Con un hito más cuando el cliente le cambió la fecha (#17): si no, ve
 * un día que no recuerda haber elegido.
 *
 * Y dos finales que lo cortan: cancelada (antes de empezar) y no
 * realizada (el trabajador llegó pero no se pudo hacer).
 *
 * Solo pinta lo que ya viene en la reserva: no calcula estados nuevos.
 *
 * Estilos: dashboard.css (cf-timeline).
 */

import { shortMoment, deadlineOf } from "./bookingFormat";

// El hito se dibuja según su marca: hecho, pendiente o cortado.
const CHECK = { icon: "fa-check", tone: "" };
const WAITING = { icon: "fa-circle", tone: "--todo" };
const STOPPED = { icon: "fa-xmark", tone: "--fail" };

/** Por qué no se pudo hacer: lo contó el trabajador al marcarlo (#18). */
const notDoneReason = (booking) =>
    booking.incidents?.find((incident) => incident.source === "worker")?.description || null;

/** Los hitos de esta reserva, en orden. */
const stepsOf = (booking) => {
    const firstName = (booking.worker_name || "").split(" ")[0];
    const steps = [];

    steps.push({
        ...CHECK,
        name: "Reserva confirmada",
        when: booking.created_at && shortMoment(booking.created_at),
    });

    // Si se movió, va aquí: pasó después de reservar y antes de empezar.
    // Sin esto, el cliente ve una fecha que no recuerda haber elegido.
    if (booking.rescheduled_count > 0) {
        steps.push({
            ...CHECK,
            name: booking.rescheduled_count === 1
                ? "Cambiaste la fecha"
                : `Cambiaste la fecha ${booking.rescheduled_count} veces`,
        });
    }

    if (booking.status === "cancelled") {
        steps.push({
            ...STOPPED,
            name: "Reserva cancelada",
            when: booking.cancelled_by_company
                ? "La canceló CleanFlow"
                : "La cancelaste tú",
        });

        return steps;
    }

    if (booking.status === "not_done") {
        steps.push({
            ...STOPPED,
            name: "No se pudo hacer",
            when: booking.started_at && shortMoment(booking.started_at),
            why: notDoneReason(booking),
        });

        return steps;
    }

    steps.push(
        booking.started_at
            ? {
                ...CHECK,
                name: `${firstName || "El trabajador"} empezó el servicio`,
                when: shortMoment(booking.started_at),
            }
            : { ...WAITING, name: "Sin empezar" }
    );

    // Las reservas anteriores a la #81 están finalizadas pero sin fecha:
    // el hito se da por hecho igual, solo que sin hora.
    if (booking.completed_at) {
        steps.push({ ...CHECK, name: "Servicio finalizado", when: shortMoment(booking.completed_at) });
    } else if (booking.status === "completed") {
        steps.push({ ...CHECK, name: "Servicio finalizado" });
    } else {
        steps.push({ ...WAITING, name: "Sin finalizar" });
    }

    // Último hito: la respuesta del cliente, que resuelve la #83.
    if (booking.client_confirmed_at) {
        steps.push({
            ...CHECK,
            name: "Lo diste por bueno",
            when: shortMoment(booking.client_confirmed_at),
        });
    } else if (booking.completed_at) {
        steps.push({
            ...WAITING,
            name: "Esperando tu confirmación",
            when: `Se confirma solo el ${deadlineOf(booking.completed_at)}`,
        });
    }

    return steps;
};

export const BookingTimeline = ({ booking }) => {
    const steps = stepsOf(booking);

    return (
        <section className="cf-bookblock">
            <h2 className="cf-bookblock__title">Cómo va</h2>

            <div className="cf-timeline">
                {steps.map((step, position) => (
                    <div key={step.name} className={`cf-timeline__step cf-timeline__step${step.tone}`}>
                        <div className="cf-timeline__rail">
                            <span className="cf-timeline__mark">
                                <i className={`fa-solid ${step.icon}`} aria-hidden="true"></i>
                            </span>
                            {/* El último hito no lleva línea: no va a ningún sitio. */}
                            {position < steps.length - 1 && <span className="cf-timeline__line"></span>}
                        </div>

                        <div className="cf-timeline__body">
                            <p className="cf-timeline__name">{step.name}</p>
                            {step.when && <p className="cf-timeline__when">{step.when}</p>}

                            {/* El motivo, aquí mismo: es lo que el cliente
                                quiere leer, y nadie se lo ha contado. */}
                            {step.why && <p className="cf-timeline__why">«{step.why}»</p>}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
