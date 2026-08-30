import { useState, useEffect } from "react";

export const GestionTurnos = () => {
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState({ name: "", start_time: "", end_time: "" });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  console.log("BACKEND URL:", backendUrl);

  const fetchShifts = async () => {
    try {
      const resp = await fetch(`${backendUrl}/api/shifts`);
      const data = await resp.json();
      setShifts(data);
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ name: "", start_time: "", end_time: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const url = editingId ? `${backendUrl}/api/shifts/${editingId}` : `${backendUrl}/api/shifts`;
    const method = editingId ? "PUT" : "POST";

    try {
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!resp.ok) {
        const data = await resp.json();
        setError(data.error || "Error al guardar el turno");
        return;
      }

      resetForm();
      fetchShifts();
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    }
  };

  const handleEdit = (shift) => {
    setForm({ name: shift.name, start_time: shift.start_time, end_time: shift.end_time });
    setEditingId(shift.shift_id);
  };

  const handleDelete = async (shiftId) => {
    setError("");
    try {
      const resp = await fetch(`${backendUrl}/api/shifts/${shiftId}`, { method: "DELETE" });

      if (!resp.ok) {
        const data = await resp.json();
        setError(data.error || "No se pudo eliminar el turno");
        return;
      }
      fetchShifts();
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="container" style={{ padding: "var(--space-8) var(--space-4)" }}>
      <h2>Gestión de turnos</h2>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "var(--space-6)", maxWidth: 400 }}>
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label>Nombre</label>
          <input className="input" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Ej: Mañana" required />
        </div>
        <div style={{ marginBottom: "var(--space-3)" }}>
          <label>Hora de inicio</label>
          <input className="input" type="time" name="start_time" value={form.start_time} onChange={handleChange} required />
        </div>
        <div style={{ marginBottom: "var(--space-4)" }}>
          <label>Hora de fin</label>
          <input className="input" type="time" name="end_time" value={form.end_time} onChange={handleChange} required />
        </div>
        <button type="submit" className="btn btn-primary">
          {editingId ? "Actualizar turno" : "Crear turno"}
        </button>
        {editingId && (
          <button type="button" className="btn btn-outline" style={{ marginLeft: "var(--space-2)" }} onClick={resetForm}>
            Cancelar
          </button>
        )}
      </form>

      <table className="table-clean">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {shifts.length === 0 && (
            <tr><td colSpan="4" className="empty-state">No hay turnos creados todavía.</td></tr>
          )}
          {shifts.map((shift) => (
            <tr key={shift.shift_id}>
              <td>{shift.name}</td>
              <td>{shift.start_time}</td>
              <td>{shift.end_time}</td>
              <td>
                <button className="btn btn-outline" onClick={() => handleEdit(shift)}>Editar</button>
                <button className="btn btn-danger" style={{ marginLeft: "var(--space-2)" }} onClick={() => handleDelete(shift.shift_id)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};