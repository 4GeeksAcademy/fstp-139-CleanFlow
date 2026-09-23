import "../../dashboard.css";
import "../../bookingTracking.css";
import { useCallback, useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import {
    getWorkerBookings,
    completeBookingTask,
    completeBooking,
} from "../../services/bookingService";
import { formatInterval } from "../../services/bookingService";

const statuses = {
    pending: "Pendiente",
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
};

const money = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
});

// Compare calendar days in Madrid, matching the backend's date rule.
const madridToday = () => {
    const parts = new Intl.DateTimeFormat("en", {
        timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const value = (type) => parts.find(part => part.type === type).value;
    return `${value("year")}-${value("month")}-${value("day")}`;
};

export const MisReservasTrabajador = () => {
    const { store, dispatch } = useGlobalReducer();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        const result = await getWorkerBookings(store.token);

        if (result.status === 401) {
            setLoading(false);
            setSaving(false);
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (result.ok) {
            setBookings(result.data.bookings);
        } else {
            setBookings([]);
            setError(result.data.message);
        }

        setLoading(false);
    }, [store.token, dispatch]);

    useEffect(() => {
        load();
    }, [load]);

    const handleTaskComplete = async (bookingId, taskId, completed) => {
        setSaving(true);
        setError("");

        const result = await completeBookingTask(
            taskId,
            store.token,
            completed
        );

        if (result.status === 401) {
            setLoading(false);
            setSaving(false);
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (result.ok) {
            setBookings(current => current.map(booking =>
                booking.booking_id === bookingId
                    ? {
                        ...booking,
                        tasks: booking.tasks.map(task =>
                            task.booking_task_id === taskId
                                ? result.data.task
                                : task
                        ),
                    }
                    : booking
            ));
        } else {
            setError(result.data.message);
        }

        setSaving(false);
    };

    const handleBookingComplete = async (bookingId) => {
        setSaving(true);
        setError("");

        const result = await completeBooking(bookingId, store.token);

        if (result.status === 401) {
            setLoading(false);
            setSaving(false);
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (result.ok) {
            setBookings(current => current.map(booking =>
                booking.booking_id === bookingId
                    ? result.data.booking
                    : booking
            ));
        } else {
            setError(result.data.message);
        }

        setSaving(false);
    };

    return (
        <div className="cf-dash-bookings">
            <div className="cf-dash-bookings__header">
                <h1>Mis reservas asignadas</h1>
                <button
                    type="button"
                    className="cf-dash-btn cf-dash-btn--ghost"
                    disabled={loading || saving}
                    onClick={load}
                >
                    Actualizar
                </button>
            </div>

            {error && (
                <div className="cf-dash-alert" role="alert">
                    {error}
                </div>
            )}

            {saving && <p role="status">Guardando cambios…</p>}

            {loading ? (
                <p role="status">Cargando reservas…</p>
            ) : (
                <>
                    {!error && bookings.length === 0 && (
                        <p>No tienes reservas asignadas.</p>
                    )}

                    {bookings.map(booking => {
                        const tasks = booking.tasks || [];
                        const completedCount = tasks.filter(
                            task => task.status === "completed"
                        ).length;
                        const allCompleted = completedCount === tasks.length;
                        const confirmed = booking.status === "confirmed";
                        const address = booking.address;
                        const today = madridToday();
                        const firstDay = booking.scheduled_start?.slice(0, 10);
                        const lastDay = (booking.days || []).reduce(
                            (latest, day) => day.starts_at.slice(0, 10) > latest
                                ? day.starts_at.slice(0, 10) : latest,
                            firstDay || ""
                        );
                        const canEditTasks = confirmed && Boolean(firstDay) && firstDay <= today;
                        const canFinish = confirmed && Boolean(lastDay) && lastDay <= today;

                        return (
                            <article
                                key={booking.booking_id}
                                className="cf-dash-bookings__card"
                            >
                                <h2 className="cf-dash-bookings__title">
                                    Reserva #{booking.booking_id}
                                </h2>

                                <p className="cf-dash-bookings__service">{booking.service?.name || "Servicio no disponible"}</p>

                                <p>
                                    Dirección: {address
                                        ? [
                                            `${address.street}, ${address.number}`,
                                            address.floor && `Piso ${address.floor}`,
                                            `${address.postal_code} ${address.city}`,
                                        ].filter(Boolean).join(" · ")
                                        : "Dirección no disponible"}
                                </p>

                                <p>
                                    Precio total: {money.format(booking.total_price)}
                                </p>

                                <p>
                                    Estado: <span className={`cf-dash-bookings__badge cf-dash-bookings__badge--${booking.status}`}>{statuses[booking.status] || booking.status}</span>
                                </p>

                                <ul>
                                    {(booking.days || []).map(day => (
                                        <li key={day.booking_day_id}>
                                            {formatInterval(day)}
                                        </li>
                                    ))}
                                </ul>

                                <h3 className="cf-dash-bookings__subtitle">
                                    Checklist: {completedCount}/{tasks.length}
                                </h3>

                                {tasks.length === 0 && (
                                    <p>Esta reserva no tiene tareas de checklist.</p>
                                )}

                                {confirmed && !canEditTasks && (
                                    <p className="cf-dash-bookings__hint">
                                        Podrás marcar las tareas a partir del día de inicio del servicio.
                                    </p>
                                )}

                                {tasks.map(task => {
                                    const completed = task.status === "completed";
                                    const inputId = `booking-task-${task.booking_task_id}`;

                                    return (
                                        <div
                                            className="cf-dash-check cf-dash-bookings__check"
                                            key={task.booking_task_id}
                                        >
                                            <input
                                                id={inputId}
                                                className="cf-dash-bookings__checkbox"
                                                type="checkbox"
                                                checked={completed}
                                                disabled={saving || !canEditTasks}
                                                onChange={(event) => handleTaskComplete(
                                                    booking.booking_id,
                                                    task.booking_task_id,
                                                    event.target.checked
                                                )}
                                            />
                                            <label
                                                className="cf-dash-bookings__check-label"
                                                htmlFor={inputId}
                                            >
                                                {task.task_name}
                                                {completed && (
                                                    <span className="cf-dash-bookings__done">
                                                        {" "}— Completada
                                                    </span>
                                                )}
                                            </label>
                                        </div>
                                    );
                                })}

                                {confirmed && (
                                    <div className="cf-dash-bookings__actions">
                                        {!canFinish && (
                                            <p className="cf-dash-bookings__hint">
                                                La reserva podrá finalizarse a partir de su último día de servicio.
                                            </p>
                                        )}
                                        {!allCompleted && (
                                            <p className="cf-dash-bookings__hint">
                                                Completa todas las tareas para finalizar la reserva.
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            className="cf-dash-btn"
                                            disabled={saving || !allCompleted || !canFinish}
                                            onClick={() => handleBookingComplete(
                                                booking.booking_id
                                            )}
                                        >
                                            Completar reserva
                                        </button>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </>
            )}
        </div>
    );
};
