import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAbsences, saveAbsence, removeAbsence, refreshAffected, formatDay } from "../../services/absenceService";

const emptyForm = () => ({ starts_on: "", ends_on: "", reason: "vacaciones", notes: "" });

export const WorkerAbsences = ({ workerId, token }) => {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        const result = await getAbsences(workerId, token);
        if (result.ok) { setRows(result.data.absences); setError(""); }
        else setError(result.data.message);
        setLoading(false);
    }, [workerId, token]);
    useEffect(() => { load(); }, [load]);

    const reset = () => { setEditingId(null); setForm(emptyForm()); };
    const submit = async (event) => {
        event.preventDefault();
        if (saving) return;
        if (form.ends_on && form.ends_on < form.starts_on) { setError("Hasta no puede ser anterior a Desde."); return; }
        setSaving(true); setError(""); setMessage("");
        const result = await saveAbsence(workerId, editingId, { ...form, ends_on: form.ends_on || null }, token);
        if (result.ok) {
            reset(); refreshAffected(); await load();
            setMessage("Ausencia guardada. La disponibilidad y las reservas afectadas se recalculan automáticamente.");
        } else setError(result.data.message);
        setSaving(false);
    };
    const remove = async (row) => {
        if (!window.confirm("¿Quitar esta ausencia? Sus fechas volverán a contar como disponibles si no hay otros impedimentos.")) return;
        setSaving(true); setError(""); setMessage("");
        const result = await removeAbsence(workerId, row.absence_id, token);
        if (result.ok) {
            if (editingId === row.absence_id) reset();
            refreshAffected(); await load(); setMessage("Ausencia eliminada.");
        } else setError(result.data.message);
        setSaving(false);
    };

    return <section className="card p-4 mt-4" aria-labelledby="absences-title">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h2 id="absences-title" className="h4 mb-0">Ausencias del trabajador</h2>
            <Link to="/dashboard/affected-bookings">Ver reservas afectadas</Link>
        </div>
        <p className="text-muted">Días completos, incluidas las fechas de inicio y fin. Deja «Hasta» vacío si aún no conoces la fecha de vuelta.</p>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {message && <div className="alert alert-success" role="status">{message}</div>}
        <form onSubmit={submit}>
            <fieldset disabled={saving || loading}>
                <legend className="h6">{editingId == null ? "Registrar ausencia" : "Editar ausencia"}</legend>
                <div className="row g-3">
                    <div className="col-md-4"><label className="form-label" htmlFor="absence-start">Desde</label>
                        <input id="absence-start" className="form-control" type="date" required value={form.starts_on} onChange={e => setForm({ ...form, starts_on: e.target.value })} /></div>
                    <div className="col-md-4"><label className="form-label" htmlFor="absence-end">Hasta (opcional)</label>
                        <input id="absence-end" className="form-control" type="date" min={form.starts_on || undefined} value={form.ends_on} onChange={e => setForm({ ...form, ends_on: e.target.value })} /></div>
                    <div className="col-md-4"><label className="form-label" htmlFor="absence-reason">Motivo</label>
                        <select id="absence-reason" className="form-select" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                            <option value="vacaciones">Vacaciones</option><option value="baja">Baja</option><option value="otro">Otro</option>
                        </select></div>
                    <div className="col-12"><label className="form-label" htmlFor="absence-notes">Notas internas</label>
                        <textarea id="absence-notes" className="form-control" maxLength={2000} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
                <div className="d-flex gap-2 mt-3 mb-4">
                    <button className="btn btn-primary" type="submit">{saving ? "Guardando…" : "Guardar ausencia"}</button>
                    {editingId != null && <button className="btn btn-outline-secondary" type="button" onClick={reset}>Cancelar edición</button>}
                </div>
            </fieldset>
        </form>
        {loading ? <p role="status">Cargando ausencias…</p> : <>
            <button className="btn btn-sm btn-outline-secondary mb-3" disabled={saving} onClick={load} type="button">Actualizar lista</button>
            {rows.length === 0 ? <p>No hay ausencias registradas.</p> : <div className="table-responsive">
                <table className="table align-middle"><thead><tr><th>Desde</th><th>Hasta</th><th>Motivo</th><th>Notas</th><th>Acciones</th></tr></thead>
                    <tbody>{rows.map(row => <tr key={row.absence_id}>
                        <td>{formatDay(row.starts_on)}</td><td>{formatDay(row.ends_on)}</td><td>{row.reason}</td><td style={{ whiteSpace: "pre-wrap" }}>{row.notes || "—"}</td>
                        <td><div className="d-flex gap-2">
                            <button type="button" className="btn btn-sm btn-outline-primary" disabled={saving} onClick={() => {
                                setEditingId(row.absence_id); setForm({ starts_on: row.starts_on, ends_on: row.ends_on || "", reason: row.reason, notes: row.notes || "" }); setError(""); setMessage("");
                            }}>Editar</button>
                            <button type="button" className="btn btn-sm btn-outline-danger" disabled={saving} onClick={() => remove(row)}>Quitar</button>
                        </div></td>
                    </tr>)}</tbody>
                </table>
            </div>}
        </>}
    </section>;
};
