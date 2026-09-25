/**
 * ESTADO DE UN SERVICIO, VISTO POR EL TRABAJADOR.
 *
 * Las mismas situaciones que ve el cliente, dichas desde su lado: para
 * él una reserva confirmada es un servicio "asignado", algo que tiene
 * pendiente, no una compra cerrada.
 *
 * Comparte los estilos de la pastilla del cliente (cf-bookstate): el
 * aspecto es el mismo en todo el panel, solo cambian las palabras.
 *
 * Estilos: dashboard.css, sección 9 (cf-bookstate).
 */

const STATES = {
    confirmed: { label: "Asignado", tone: "wait", icon: "fa-calendar-check" },
    pending: { label: "Asignado", tone: "wait", icon: "fa-calendar-check" },
    in_progress: { label: "En curso", tone: "live", dot: true },
    completed: { label: "Finalizado", tone: "done", icon: "fa-check" },
    not_done: { label: "No realizado", tone: "fail", dot: true },
    cancelled: { label: "Cancelado", tone: "wait", icon: "fa-circle-xmark" },
};

export const WorkerStatus = ({ status }) => {
    // Un estado desconocido no debe romper la pantalla: se enseña tal cual.
    const state = STATES[status] || { label: status, tone: "wait" };

    return (
        <span className={`cf-bookstate cf-bookstate--${state.tone}`}>
            {state.dot && <span className="cf-bookstate__dot"></span>}
            {state.icon && <i className={`fa-solid ${state.icon}`} aria-hidden="true"></i>}
            {state.label}
        </span>
    );
};
