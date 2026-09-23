import "../../dashboard.css";
import "../../bookingTracking.css";
import { useCallback, useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import {
    getMyBookings, getManagedBookings, cancelBooking, formatInterval,
} from "../../services/bookingService";
import { refreshAffected } from "../../services/absenceService";

const statuses = { pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada" };

// Listado privado del cliente o listado general del encargado.
export const MyBookings = () => {
    const { store, dispatch } = useGlobalReducer();
    const isManager = store.user?.role === "manager";
    const [cancellingId, setCancellingId] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true); setError("");
        const result = await (
            isManager ? getManagedBookings(store.token) : getMyBookings(store.token)
        );
        if (result.status === 401) {
            setLoading(false);
            dispatch({ type: "LOGOUT" });
            return;
        }
        if (result.ok) setRows(result.data.bookings);
        else setError(result.data.message);
        setLoading(false);
    }, [store.token, dispatch, isManager]); useEffect(() => { load(); }, [load]);

    const handleCancel = async (booking) => {
        if (!window.confirm(
            `¿Cancelar la reserva #${booking.booking_id}? Se liberará su horario.`
        )) return;

        setCancellingId(booking.booking_id);
        setError("");

        const result = await cancelBooking(booking.booking_id, store.token);

        if (result.status === 401) {
            setCancellingId(null);
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (result.ok) {
            setRows(current => current.map(row =>
                row.booking_id === booking.booking_id ? result.data.booking : row
            ));
            refreshAffected();
        } else {
            setError(result.data.message);
        }

        setCancellingId(null);
    };

    return <div className="cf-dash-bookings">
        <div className="cf-dash-bookings__header">
            <h1>{isManager ? "Reservas" : "Mis reservas"}</h1>
            <button className="cf-dash-btn cf-dash-btn--ghost" type="button" disabled={loading || cancellingId !== null} onClick={load}>Actualizar</button>
        </div>
        {error && <div className="cf-dash-alert" role="alert">{error}</div>}
        {loading ? <p role="status">Cargando reservas…</p> : <>
            {!error && !rows.length && <p>No hay reservas para mostrar.</p>}
            {rows.map(booking => <article key={booking.booking_id} className="cf-dash-bookings__card">
                <h2 className="cf-dash-bookings__title">Reserva #{booking.booking_id}</h2>
                <p className="cf-dash-bookings__service">{booking.service?.name || "Servicio no disponible"}</p>
                <p>
                    Dirección: {booking.address
                        ? [
                            `${booking.address.street}, ${booking.address.number}`,
                            booking.address.floor && `Piso ${booking.address.floor}`,
                            `${booking.address.postal_code} ${booking.address.city}`,
                        ].filter(Boolean).join(" · ")
                        : "Dirección no disponible"}
                </p>
                <p>
                    Precio total: {new Intl.NumberFormat("es-ES", {
                        style: "currency",
                        currency: "EUR",
                    }).format(booking.total_price)}
                </p>
                <p>Trabajador: {booking.worker_name || "Sin asignar"}</p>
                <ul>{booking.days.map(day => <li key={day.booking_day_id}>{formatInterval(day)}</li>)}</ul>
                {booking.cancelled_by_company ? <div className="cf-dash-bookings__notice">
                    <strong>Cancelada por CleanFlow</strong>
                    <p className="cf-dash-bookings__status" style={{ whiteSpace: "pre-wrap" }}>{booking.cancellation_reason}</p>
                </div> : <p className="cf-dash-bookings__status">Estado: <span className={`cf-dash-bookings__badge cf-dash-bookings__badge--${booking.status}`}>{statuses[booking.status] || booking.status}</span></p>}

                {(booking.status === "pending" ||
                    (isManager && booking.status === "confirmed")) && (
                    <div className="cf-dash-bookings__actions">
                        <button
                            type="button"
                            className="cf-dash-btn cf-dash-btn--danger"
                            disabled={cancellingId !== null}
                            onClick={() => handleCancel(booking)}
                        >
                            {cancellingId === booking.booking_id
                                ? "Cancelando…" : "Cancelar reserva"}
                        </button>
                    </div>
                )}
            </article>)}
        </>}
    </div>;
};
