/**
 * LA ACCIÓN DEL MOMENTO.
 *
 * Empezar, cerrar el día o finalizar el servicio. Solo una de las tres
 * tiene sentido en cada instante, así que solo se enseña una, con el
 * motivo escrito encima cuando todavía no se puede pulsar.
 *
 * Decide lo mismo que el backend, pero el backend manda: si responde
 * 409, la página enseña su mensaje. Esto solo evita el viaje.
 *
 * Debajo van las dos salidas de la #18: abrir una incidencia, que no
 * cambia nada del servicio, y darlo por no realizado, que lo cierra
 * para siempre.
 *
 * Solo pinta y avisa: quien llama a la API es la página.
 *
 * Estilos: dashboard.css, sección 10 (cf-wact).
 */

import { dayOfToday } from "./WorkerToday";

/**
 * Qué toca ahora: { action, label, icon, ready, note } o null si no hay
 * nada que hacer (el servicio ya está cerrado, o no es hoy).
 */
const nextAction = (booking, today) => {
    // Un servicio terminado, cancelado o no realizado ya no se toca.
    if (!["confirmed", "pending", "in_progress"].includes(booking.status)) return null;

    const day = dayOfToday(booking, today);

    // Sin tramo hoy no hay nada que empezar ni que cerrar: se prepara y
    // se vuelve el día que toca.
    if (!day) {
        return {
            note: "Podrás empezar el día del servicio.",
            label: "Empezar el servicio",
            icon: "fa-play",
            action: "start",
            ready: false,
        };
    }

    if (!day.started_at) {
        return { label: "Empezar el servicio", icon: "fa-play", action: "start", ready: true };
    }

    if (day.finished_at) {
        return { note: "Has cerrado el día. Nos vemos mañana.", label: null };
    }

    // Quedan días por delante: hoy se cierra, el servicio no.
    const ahead = booking.days.some((other) => other.starts_at.slice(0, 10) > today);

    if (ahead) {
        return {
            note: "Quedan tareas para los próximos días.",
            label: "Terminar el día",
            icon: "fa-arrow-right",
            action: "finishDay",
            ready: true,
            ghost: true,
        };
    }

    // Último día: para finalizar hay que haberlo cerrado todo.
    const pending = booking.tasks.filter((task) => task.status !== "completed").length;

    return {
        note: pending > 0
            ? `Te ${pending === 1 ? "falta 1 tarea" : `faltan ${pending} tareas`} por cerrar`
            : null,
        label: "Finalizar servicio",
        icon: "fa-flag-checkered",
        action: "complete",
        ready: pending === 0,
    };
};

export const WorkerActions = ({ booking, today, busy, onAction, onIncident, onNotDone }) => {
    const next = nextAction(booking, today);

    // Una incidencia se puede abrir mientras el servicio siga vivo.
    const canReport = booking.status !== "cancelled";

    // Darlo por no realizado, solo el día y antes de cerrarlo: las mismas
    // reglas que el backend.
    const canGiveUp =
        ["confirmed", "pending", "in_progress"].includes(booking.status)
        && booking.days.some((day) => day.starts_at.slice(0, 10) === today);

    // Sin acción y sin nada que contar, el bloque entero sobra.
    if (!next && !canReport) return null;

    return (
        <div className="cf-wact">
            {next?.note && <p className="cf-wact__note">{next.note}</p>}

            {next?.label && (
                <button
                    type="button"
                    className={`cf-dash-btn${next.ghost ? " cf-dash-btn--ghost" : ""}`}
                    disabled={!next.ready || busy}
                    onClick={() => onAction(next.action)}
                >
                    <i className={`fa-solid ${next.icon}`} aria-hidden="true"></i>
                    {next.label}
                </button>
            )}

            {canReport && (
                <>
                    <p className="cf-wact__sep">¿ha pasado algo?</p>

                    <div className="cf-wact__more">
                        <button
                            type="button"
                            className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                            disabled={busy}
                            onClick={onIncident}
                        >
                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                            Abrir incidencia
                        </button>

                        {/* Cierra el servicio para siempre: sin botón
                            llamativo, y con su confirmación detrás. */}
                        {canGiveUp && (
                            <button
                                type="button"
                                className="cf-dash-btn cf-dash-btn--sm cf-wact__quiet"
                                disabled={busy}
                                onClick={onNotDone}
                            >
                                No se ha podido hacer el servicio
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
