import { useCallback, useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { getAffected, getReplacements, reassignBooking, cancelCompany, refreshAffected, formatInterval } from "../../services/absenceService";

const BookingResolution = ({ booking, token, onResolved }) => {
    const [workers, setWorkers] = useState(null);
    const [selected, setSelected] = useState("");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const loadOptions = async () => {
        setBusy(true); setError(""); setWorkers(null); setSelected("");
        const result = await getReplacements(booking.booking_id, token);
        if (result.ok) setWorkers(result.data.workers);
        else setError(result.data.message);
        setBusy(false);
    };
    const submit = async (event) => {
        event.preventDefault();
        if (busy || workers == null) return;
        const cancelling = workers.length === 0;
        if (cancelling && !reason.trim()) { setError("Escribe el motivo que verá el cliente."); return; }
        if (!cancelling && !selected) { setError("Selecciona un trabajador."); return; }
        if (cancelling && !window.confirm("¿Cancelar la reserva como CleanFlow con este motivo?")) return;
        setBusy(true); setError("");
        const result = cancelling
            ? await cancelCompany(booking.booking_id, reason.trim(), token)
            : await reassignBooking(booking.booking_id, selected, token);
        if (result.ok) { refreshAffected(); await onResolved(result.data.message); }
        else { setError(result.data.message); setWorkers(null); }
        setBusy(false);
    };

    return <article className="card p-4 mb-3">
        <div className="d-flex justify-content-between flex-wrap gap-2">
            <h2 className="h5">Reserva #{booking.booking_id} · {booking.client_name}</h2>
            <span className="badge bg-warning text-dark align-self-start">Requiere atención</span>
        </div>
        <p className="mb-1">Trabajador: <strong>{booking.worker_name || "Sin trabajador"}</strong></p>
        <p className="text-danger">{booking.affected_reasons.join(" · ")}</p>
        <ul>{booking.days.map(day => <li key={day.booking_day_id}>{formatInterval(day)}</li>)}</ul>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <button type="button" className="btn btn-outline-primary align-self-start mb-3" disabled={busy} onClick={loadOptions}>
            {busy ? "Consultando o guardando…" : workers == null ? "Resolver reserva" : "Actualizar candidatos"}
        </button>
        {workers !== null && <form onSubmit={submit}>
            <fieldset disabled={busy}>
                {workers.length > 0 ? <>
                    <label htmlFor={`replacement-${booking.booking_id}`} className="form-label">Trabajador libre en todos los días</label>
                    <select id={`replacement-${booking.booking_id}`} className="form-select mb-3" required value={selected} onChange={e => setSelected(e.target.value)}>
                        <option value="">Selecciona un trabajador</option>
                        {workers.map(worker => <option key={worker.worker_id} value={worker.worker_id}>{worker.name} {worker.last_name} · {worker.shift_name}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary">Reasignar reserva</button>
                </> : <>
                    <p>No hay sustitutos disponibles para todos los días. Puedes cancelar como empresa.</p>
                    <label htmlFor={`cancel-${booking.booking_id}`} className="form-label">Motivo que verá el cliente</label>
                    <textarea id={`cancel-${booking.booking_id}`} className="form-control mb-3" required maxLength={1000} rows={3} value={reason} onChange={e => setReason(e.target.value)} />
                    <button type="submit" className="btn btn-danger">Cancelar como CleanFlow</button>
                </>}
            </fieldset>
        </form>}
    </article>;
};

export const AffectedBookings = () => {
    const { store } = useGlobalReducer();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const load = useCallback(async () => {
        setLoading(true); setError("");
        const result = await getAffected(store.token);
        if (result.ok) setBookings(result.data.bookings);
        else setError(result.data.message);
        setLoading(false);
    }, [store.token]);
    useEffect(() => { load(); }, [load]);
    return <div className="container py-3">
        <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
            <h1>Reservas afectadas</h1>
            <button className="btn btn-outline-secondary align-self-center" type="button" disabled={loading} onClick={load}>Actualizar</button>
        </div>
        <p className="text-muted">Ausencias y trabajadores desactivados con servicios pendientes de realizar.</p>
        {message && <div className="alert alert-success" role="status">{message}</div>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {loading ? <p role="status">Cargando reservas…</p> : !error && <>
            <p>{bookings.length} reservas requieren atención.</p>
            {bookings.length === 0 && <div className="alert alert-success">No hay reservas afectadas.</div>}
            {bookings.map(booking => <BookingResolution key={booking.booking_id} booking={booking} token={store.token} onResolved={async text => { setMessage(text); await load(); }} />)}
        </>}
    </div>;
};