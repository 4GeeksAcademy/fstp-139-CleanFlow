/**
 * ESTADO DE UNA RESERVA, VISTO POR EL CLIENTE.
 *
 * Una sola pieza para todo el panel: la usan el listado, el detalle y,
 * más adelante, cancelar (#17) y confirmar o reclamar (#83).
 *
 * El tono sigue al resto del panel: verde lo que va bien, terracota lo
 * que pide atención y gris lo que solo espera. Cada estado lleva además
 * su punto o su icono, porque el color por sí solo no se ve igual para
 * todo el mundo.
 *
 * Estilos: dashboard.css (cf-bookstate).
 */

// Cómo se pinta cada estado: el texto, la variante de color y el adorno
// que lo acompaña ("dot" late si el servicio está en marcha).
const STATES = {
    confirmed: { label: "Confirmada", tone: "wait", icon: "fa-calendar-check" },
    in_progress: { label: "En curso", tone: "live", dot: true },
    completed: { label: "Finalizada", tone: "done", icon: "fa-check" },
    not_done: { label: "No realizada", tone: "fail", dot: true },
    cancelled: { label: "Cancelada", tone: "wait", icon: "fa-circle-xmark" },
    pending: { label: "Pendiente", tone: "wait", icon: "fa-clock" },
};

// Cuando el servicio está finalizado pero el cliente aún no ha dicho nada,
// el estado deja de ser informativo y pasa a pedir una respuesta (#83).
const AWAITING = {
    label: "Pendiente de tu confirmación",
    tone: "action",
    icon: "fa-clock",
};

/**
 * ¿Este servicio está esperando a que el cliente diga algo?
 *
 * Lo decide el backend en Booking.confirmation (#83), que distingue
 * cuatro casos. Repetir aquí la cuenta de los días haría que una reserva
 * ya reclamada siguiera pidiendo una respuesta que el cliente ya dio.
 */
export const awaitsConfirmation = (booking) => booking.confirmation === "pending";

export const BookingStatusPill = ({ status, awaitingConfirmation = false }) => {
    // Un estado desconocido no debe romper la pantalla: se enseña tal cual.
    const state = awaitingConfirmation
        ? AWAITING
        : STATES[status] || { label: status, tone: "wait" };

    return (
        <span className={`cf-bookstate cf-bookstate--${state.tone}`}>
            {state.dot && <span className="cf-bookstate__dot"></span>}
            {state.icon && <i className={`fa-solid ${state.icon}`} aria-hidden="true"></i>}
            {state.label}
        </span>
    );
};
