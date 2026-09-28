const unavailable = new Set(["cancelled", "not_done"]);
const editable = new Set(["pending", "confirmed", "in_progress"]);

export const serviceName = (booking) => booking.service?.name || "Servicio";
export const taskPath = (booking, anchor = "") => `/dashboard/tasks/${booking.booking_id}${anchor}`;
export const addressText = (address) => address
    ? [[address.street, address.number].filter(Boolean).join(", "), address.floor,
        [address.postal_code, address.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ")
    : "Dirección no disponible";
export const hoursText = (hours) => `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(hours)} h`;

// Son horas previstas de Madrid sin zona, como las devuelve la API.
const duration = (day) => Math.max(0,
    (Date.parse(`${day.ends_at.slice(0, 19)}Z`) - Date.parse(`${day.starts_at.slice(0, 19)}Z`)) / 3600000
) || 0;

export const workerHomeData = (bookings, today, now) => {
    const rows = bookings.filter((booking) => !unavailable.has(booking.status))
        .flatMap((booking) => (booking.days || []).map((day) => ({
            booking, day, key: `${booking.booking_id}-${day.booking_day_id}`,
        })))
        .sort((a, b) => a.day.starts_at.localeCompare(b.day.starts_at));
    const journey = rows.filter(({ day }) => day.starts_at.slice(0, 10) === today);
    const actionable = journey.filter(({ booking, day }) => editable.has(booking.status) && !day.finished_at);
    // Un tramo empezado tiene prioridad, incluso si ya pasó su hora prevista.
    const current = actionable.find(({ day }) => day.started_at)
        || actionable.find(({ day }) => day.starts_at <= now && day.ends_at > now)
        || actionable.find(({ day }) => day.starts_at > now)
        || actionable[0] || null;
    const future = rows.filter(({ booking, day }) => editable.has(booking.status)
        && !day.finished_at && day.starts_at.slice(0, 10) > today);
    const unfinished = [];
    bookings.filter((booking) => !unavailable.has(booking.status)).forEach((booking) => {
        const days = booking.days || [];
        days.filter((day) => day.started_at && !day.finished_at && day.ends_at.slice(0, 10) < today)
            .forEach((day) => unfinished.push({
                key: `day-${day.booking_day_id}`, booking,
                text: `Día sin cerrar · ${day.starts_at.slice(0, 10).split("-").reverse().join("/")}`,
                to: taskPath(booking, `#day-${day.booking_day_id}`),
            }));
        // Las tareas pertenecen a la reserva, no a un tramo: vencen al terminar el último.
        const ended = days.length > 0 && days.every((day) => day.ends_at <= now);
        (booking.tasks || []).forEach((task) => {
            const pending = ended && ["pending", "in_progress"].includes(task.status);
            const missingPhoto = task.status === "completed" && !["before", "after"].every((kind) => task.photos?.some((photo) => photo.kind === kind));
            if (pending || missingPhoto) unfinished.push({
                key: `task-${task.booking_task_id}`, booking,
                text: `${task.task_name || "Tarea"} · ${missingPhoto ? "falta la foto" : "sin completar"}`,
                to: taskPath(booking, `#task-${task.booking_task_id}`),
            });
        });
    });
    return { journey, current, future, unfinished,
        services: new Set(journey.map(({ booking }) => booking.booking_id)).size,
        hours: journey.reduce((total, { day }) => total + duration(day), 0) };
};
