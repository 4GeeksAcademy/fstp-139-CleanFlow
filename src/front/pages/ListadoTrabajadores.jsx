import { useState, useEffect } from "react";

export const ListadoTrabajadores = () => {
  const [workers, setWorkers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [editingWorker, setEditingWorker] = useState(null);
  const [form, setForm] = useState({ position: "", is_active: true, shift_id: "" });

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${backendUrl}/api/workers`);
      const data = await resp.json();
      setWorkers(data);
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const resp = await fetch(`${backendUrl}/api/shifts`);
      if (resp.ok) {
        const data = await resp.json();
        setShifts(data);
      }
    } catch (err) {
      // silencioso: si /api/shifts aún no existe en esta rama, el select queda vacío
    }
  };

  useEffect(() => {
    fetchWorkers();
    fetchShifts();
  }, []);

  const openEditModal = (worker) => {
    setEditingWorker(worker);
    setForm({
      position: worker.position || "",
      is_active: worker.is_active,
      shift_id: worker.shift_id || "",
    });
  };

  const closeModal = () => setEditingWorker(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const resp = await fetch(`${backendUrl}/api/workers/${editingWorker.worker_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          shift_id: form.shift_id ? Number(form.shift_id) : null,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        setError(data.error || "Error al guardar los cambios");
        return;
      }

      closeModal();
      fetchWorkers();
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="container" style={{ padding: "var(--space-8) var(--space-4)" }}>
      <h2>Listado de trabajadores</h2>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <p className="empty-state">Cargando...</p>
      ) : (
        <table className="table-clean">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Puesto</th>
              <th>Turno</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {workers.length === 0 && (
              <tr><td colSpan="5" className="empty-state">No hay trabajadores registrados todavía.</td></tr>
            )}
            {workers.map((worker) => (
              <tr key={worker.worker_id}>
                <td>{worker.email}</td>
                <td>{worker.position || "—"}</td>
                <td>{worker.shift_name || "—"}</td>
                <td>
                  <span className={`badge ${worker.is_active ? "badge-success" : "badge-warning"}`}>
                    {worker.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-outline" onClick={() => openEditModal(worker)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingWorker && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "var(--color-overlay)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: "100%", maxWidth: 400 }}
          >
            <h3 style={{ marginTop: 0 }}>Editar trabajador</h3>
            <p style={{ color: "var(--color-text-muted)", marginTop: "calc(-1 * var(--space-2))" }}>
              {editingWorker.email}
            </p>

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: "var(--space-3)" }}>
                <label>Puesto</label>
                <input
                  className="input" type="text" name="position"
                  value={form.position} onChange={handleChange}
                  placeholder="Ej: Limpiador"
                />
              </div>

              <div style={{ marginBottom: "var(--space-3)" }}>
                <label>Turno</label>
                <select
                  className="input" name="shift_id"
                  value={form.shift_id} onChange={handleChange}
                >
                  <option value="">Sin turno asignado</option>
                  {shifts.map((shift) => (
                    <option key={shift.shift_id} value={shift.shift_id}>
                      {shift.name} ({shift.start_time}–{shift.end_time})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <input
                  type="checkbox" name="is_active" id="is_active"
                  checked={form.is_active} onChange={handleChange}
                />
                <label htmlFor="is_active" style={{ margin: 0 }}>Activo</label>
              </div>

              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="submit" className="btn btn-primary">Guardar</button>
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};