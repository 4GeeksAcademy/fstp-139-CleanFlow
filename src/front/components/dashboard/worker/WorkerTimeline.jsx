/**
 * LÍNEA DE TIEMPO DEL SERVICIO, PARA EL TRABAJADOR.
 *
 * Tres hitos tumbados: asignado, en curso y finalizado, cada uno con su
 * hora real. Y dos finales que cortan el camino: cancelado y no
 * realizado.
 *
 * Va tumbada y no en vertical como la del cliente: esta pantalla se usa
 * en el móvil y tres hitos en columna se comerían media pantalla.
 *
 * Estilos: dashboard.css, sección 10 (cf-wtrack).
 */

import { shortMoment } from "../bookings/bookingFormat";

const DONE = { icon: "fa-check", tone: "" };
const TODO = { icon: "fa-circle", tone: "--todo" };
const STOPPED = { icon: "fa-xmark", tone: "--fail" };

/** Los hitos de este servicio, en orden. */
const stepsOf = (booking) => {
    const assigned = { ...DONE, name: "Asignado" };

    if (booking.status === "cancelled") {
        return [assigned, { ...STOPPED, name: "Cancelado" }];
    }

    if (booking.status === "not_done") {
        return [
            assigned,
            {
                ...STOPPED,
                name: "No realizado",
                when: booking.started_at && shortMoment(booking.started_at),
            },
        ];
    }

    return [
        assigned,
        booking.started_at
            ? { ...DONE, name: "En curso", when: shortMoment(booking.started_at) }
            : { ...TODO, name: "En curso" },
        booking.completed_at
            ? { ...DONE, name: "Finalizado", when: shortMoment(booking.completed_at) }
            : { ...TODO, name: "Finalizado" },
    ];
};

export const WorkerTimeline = ({ booking }) => (
    <section className="cf-wblock">
        <h2 className="cf-wblock__title">Progreso</h2>

        <div className="cf-wtrack">
            {stepsOf(booking).map((step) => (
                <div key={step.name} className={`cf-wtrack__step cf-wtrack__step${step.tone}`}>
                    <span className="cf-wtrack__mark">
                        <i className={`fa-solid ${step.icon}`} aria-hidden="true"></i>
                    </span>
                    <span className="cf-wtrack__name">{step.name}</span>
                    {step.when && <span className="cf-wtrack__when">{step.when}</span>}
                </div>
            ))}
        </div>
    </section>
);
