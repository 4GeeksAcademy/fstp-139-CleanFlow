import { useCallback, useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { getMyBookings, formatInterval } from "../../services/absenceService";

const statuses = { pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada" };

// Vista mínima para comprobar el resultado de #15. Integrar con la vista definitiva de #16.
export const MyBookings = () => {
    const { store } = useGlobalReducer();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true); setError("");
        const result = await getMyBookings(store.token);
        if (result.ok) setRows(result.data.bookings);
        else setError(result.data.message);
        setLoading(false);
    }, [store.token]);
    useEffect(() => { load(); }, [load]);
    return <div className="container py-3">
        <div className="d-flex justify-content-between flex-wrap gap-2 mb-4">
            <h1>Mis reservas</h1>
            <button className="btn btn-outline-secondary align-self-center" type="button" disabled={loading} onClick={load}>Actualizar</button>
        </div>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {loading ? <p role="status">Cargando reservas…</p> : !error && <>
            {!rows.length && <p>Todavía no tienes reservas.</p>}
            {rows.map(booking => <article key={booking.booking_id} className="card p-4 mb-3">
                <h2 className="h5">Reserva #{booking.booking_id}</h2>
                <p>Trabajador: {booking.worker_name || "Sin asignar"}</p>
                <ul>{booking.days.map(day => <li key={day.booking_day_id}>{formatInterval(day)}</li>)}</ul>
                {booking.cancelled_by_company ? <div className="alert alert-warning mb-0">
                    <strong>Cancelada por CleanFlow</strong>
                    <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{booking.cancellation_reason}</p>
                </div> : <p className="mb-0">Estado: {statuses[booking.status] || booking.status}</p>}
            </article>)}
        </>}
    </div>;
};