import { useCallback, useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import {
    getWorkerBookings,
    completeBookingTask,
    completeBooking,
} from "../../services/bookingService";
import { formatInterval } from "../../services/absenceService";

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

export const MisReservasTrabajador = () => {
    const { store } = useGlobalReducer();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        const result = await getWorkerBookings(store.token);

        if (result.ok) {
            setBookings(result.data.bookings);
        } else {
            setBookings([]);
            setError(result.data.message);
        }

        setLoading(false);
    }, [store.token]);

    useEffect(() => {
        load();
    }, [load]);

    const handleTaskComplete = async (bookingId, taskId) => {
        setSaving(true);
        setError("");

        const result = await completeBookingTask(taskId, store.token);

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
        <div className="container py-3">
            <div className="d-flex justify-content-between flex-wrap gap-2 mb-4">
                <h1>Mis reservas asignadas</h1>
                <button
                    type="button"
                    className="btn btn-outline-secondary align-self-center"
                    disabled={loading || saving}
                    onClick={load}
                >
                    Actualizar
                </button>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
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

                        return (
                            <article
                                key={booking.booking_id}
                                className="card p-4 mb-3"
                            >
                                <h2 className="h5">
                                    Reserva #{booking.booking_id}
                                </h2>

                                <p>Servicio: {booking.service_name}</p>

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
                                    Estado: {statuses[booking.status] || booking.status}
                                </p>

                                <ul>
                                    {(booking.days || []).map(day => (
                                        <li key={day.booking_day_id}>
                                            {formatInterval(day)}
                                        </li>
                                    ))}
                                </ul>

                                <h3 className="h6">
                                    Checklist: {completedCount}/{tasks.length}
                                </h3>

                                {tasks.length === 0 && (
                                    <p>Esta reserva no tiene tareas de checklist.</p>
                                )}

                                {tasks.map(task => {
                                    const completed = task.status === "completed";
                                    const inputId = `booking-task-${task.booking_task_id}`;

                                    return (
                                        <div
                                            className="form-check mb-2"
                                            key={task.booking_task_id}
                                        >
                                            <input
                                                id={inputId}
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={completed}
                                                disabled={saving || completed || !confirmed}
                                                onChange={() => handleTaskComplete(
                                                    booking.booking_id,
                                                    task.booking_task_id
                                                )}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor={inputId}
                                            >
                                                {task.task_name}
                                                {completed && (
                                                    <span className="text-success">
                                                        {" "}— Completada
                                                    </span>
                                                )}
                                            </label>
                                        </div>
                                    );
                                })}

                                {confirmed && (
                                    <div className="mt-3">
                                        {!allCompleted && (
                                            <p className="text-muted">
                                                Completa todas las tareas para finalizar la reserva.
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            disabled={saving || !allCompleted}
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