import { useEffect, useRef, useState } from "react";
import useGlobalReducer from "../../../hooks/useGlobalReducer";
import { apiRequest } from "../../../services/apiClient";
import { formatDay } from "../../../services/absenceService";

const reasons = { vacaciones: "Vacaciones", baja: "Baja", otro: "Otra ausencia" };

export const WorkerAbsences = ({ today }) => {
    const { store, dispatch } = useGlobalReducer();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [notice, setNotice] = useState("");
    const sending = useRef(false);
    const [form, setForm] = useState({ starts_on: today, ends_on: "", reason: "vacaciones", notes: "" });

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        apiRequest("/api/workers/me/absences", { token: store.token }).then((result) => {
            if (!active) return;
            if (result.status === 401) dispatch({ type: "LOGOUT" });
            else if (result.ok) setRows(result.data.absences);
            else setError(result.data.message);
            setLoading(false);
        });
        return () => { active = false; };
    }, [store.token, dispatch, retry, today]);

    const submit = async (event) => {
        event.preventDefault();
        if (sending.current) return;
        sending.current = true;
        setSaving(true);
        setFormError("");
        const result = await apiRequest("/api/workers/me/absence-requests", {
            token: store.token, method: "POST", body: { ...form, ends_on: form.ends_on || null },
        });
        sending.current = false;
        setSaving(false);
        if (result.status === 401) dispatch({ type: "LOGOUT" });
        else if (!result.ok) setFormError(result.data.message);
        else {
            setOpen(false);
            setNotice(result.data.message);
            setForm({ starts_on: today, ends_on: "", reason: "vacaciones", notes: "" });
        }
    };

    const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
    return <section className="cf-worker-home__card">
        <h2>Tus ausencias</h2>
        <p>Registradas por tu encargado.</p>
        {loading ? <p role="status">Cargando ausencias…</p> : error ? <div role="alert">
            <p>{error}</p><button className="cf-dash-btn cf-dash-btn--ghost" onClick={() => setRetry((value) => value + 1)}>Reintentar</button>
        </div> : rows.length === 0 ? <p>No tienes próximas ausencias registradas.</p>
            : <ul className="cf-worker-home__list">{rows.map((row) => <li key={row.absence_id}>
                <strong>{reasons[row.reason] || "Ausencia"}</strong>
                <span>{formatDay(row.starts_on)} – {formatDay(row.ends_on)}</span>
            </li>)}</ul>}
        {notice && <p role="status">{notice}</p>}
        <button type="button" className="cf-dash-btn cf-dash-btn--ghost" aria-expanded={open}
            aria-controls="absence-request" disabled={saving} onClick={() => { setOpen(!open); setNotice(""); }}>
            {open ? "Cancelar solicitud" : "Pedir una ausencia"}
        </button>
        {open && <form id="absence-request" className="cf-worker-home__absence-form" onSubmit={submit}>
            <p>El encargado recibirá tu solicitud y decidirá si registra la ausencia.</p>
            <label>Desde<input className="cf-dash-input" type="date" name="starts_on" value={form.starts_on} onChange={change} required disabled={saving} /></label>
            <label>Hasta (opcional)<input className="cf-dash-input" type="date" name="ends_on" min={form.starts_on} value={form.ends_on} onChange={change} disabled={saving} /></label>
            <label>Motivo<select className="cf-dash-input" name="reason" value={form.reason} onChange={change} disabled={saving}>
                {Object.entries(reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Comentario (opcional)<textarea className="cf-dash-input" name="notes" maxLength={2000} value={form.notes} onChange={change} disabled={saving} /></label>
            {formError && <p role="alert">{formError}</p>}
            <button className="cf-dash-btn" disabled={saving}>{saving ? "Enviando…" : "Enviar al encargado"}</button>
        </form>}
    </section>;
};
