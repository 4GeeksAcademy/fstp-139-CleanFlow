import "../../dashboard.css";
import "../../bookingTracking.css";
import { useCallback, useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { getMyBookings, formatInterval } from "../../services/bookingService";

const statuses = { pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada" };

// Listado privado de reservas del cliente.
export const MyBookings = () => {
    const { store, dispatch } = useGlobalReducer();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true); setError("");
        const result = await getMyBookings(store.token);
        if (result.status === 401) {
            setLoading(false);
            dispatch({ type: "LOGOUT" });
            return;
        }
        if (result.ok) setRows(result.data.bookings);
        else setError(result.data.message);
        setLoading(false);
    }, [store.token, dispatch]); useEffect(() => { load(); }, [load]);
    return <div className="cf-dash-bookings">
        <div className="cf-dash-bookings__header">
            <h1>Mis reservas</h1>
            <button className="cf-dash-btn cf-dash-btn--ghost" type="button" disabled={loading} onClick={load}>Actualizar</button>
        </div>
        {error && <div className="cf-dash-alert" role="alert">{error}</div>}
        {loading ? <p role="status">Cargando reservas…</p> : !error && <>
            {!rows.length && <p>Todavía no tienes reservas.</p>}
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
            </article>)}
        </>}
    </div>;
};
