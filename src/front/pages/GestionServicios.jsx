import { useState, useEffect } from "react";

const emptyTask = () => ({ name: "", description: "", estimated_minutes: "", is_required: true });

export const GestionServicios = () => {
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", base_hourly_rate: "",
    default_duration_minutes: 120, min_duration_minutes: 60, max_duration_minutes: 240,
  });
  const [tasks, setTasks] = useState([emptyTask()]);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const fetchServices = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${backendUrl}/api/services`);
      const data = await resp.json();
      setServices(data);
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const resetForm = () => {
    setForm({ name: "", description: "", base_hourly_rate: "", default_duration_minutes: 120, min_duration_minutes: 60, max_duration_minutes: 240 });
    setTasks([emptyTask()]);
    setShowForm(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleTaskChange = (index, field, value) => {
    const updated = [...tasks];
    updated[index][field] = value;
    setTasks(updated);
  };

  const addTaskRow = () => setTasks([...tasks, emptyTask()]);
  const removeTaskRow = (index) => setTasks(tasks.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      ...form,
      base_hourly_rate: Number(form.base_hourly_rate),
      default_duration_minutes: Number(form.default_duration_minutes),
      min_duration_minutes: Number(form.min_duration_minutes),
      max_duration_minutes: Number(form.max_duration_minutes),
      tasks: tasks
        .filter((t) => t.name.trim() !== "")
        .map((t) => ({ ...t, estimated_minutes: t.estimated_minutes ? Number(t.estimated_minutes) : null })),
    };

    try {
      const resp = await fetch(`${backendUrl}/api/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const data = await resp.json();
        setError(data.error || "Error al crear el servicio");
        return;
      }

      resetForm();
      fetchServices();
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    }
  };

  const toggleActive = async (service) => {
    setError("");
    try {
      const resp = await fetch(`${backendUrl}/api/services/${service.service_id}`, {
        method: service.is_active ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: service.is_active ? undefined : JSON.stringify({ is_active: true }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        setError(data.error || "No se pudo actualizar el estado");
        return;
      }
      fetchServices();
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="container" style={{ padding: "var(--space-8) var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <h2 style={{ margin: 0 }}>Gestión de servicios</h2>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Nuevo servicio
          </button>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "var(--space-6)" }}>
          <h3 style={{ marginTop: 0 }}>Nuevo servicio</h3>

          <div style={{ marginBottom: "var(--space-3)" }}>
            <label>Nombre</label>
            <input className="input" type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="Ej: Limpieza general" required />
          </div>

          <div style={{ marginBottom: "var(--space-3)" }}>
            <label>Descripción</label>
            <input className="input" type="text" name="description" value={form.description} onChange={handleFormChange} placeholder="Descripción breve del servicio" />
          </div>

          <div style={{ marginBottom: "var(--space-3)" }}>
            <label>Precio por hora (€)</label>
            <input className="input" type="number" step="0.01" min="0" name="base_hourly_rate" value={form.base_hourly_rate} onChange={handleFormChange} required />
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            <div style={{ flex: 1 }}>
              <label>Duración mín. (min)</label>
              <input className="input" type="number" step="30" min="30" name="min_duration_minutes" value={form.min_duration_minutes} onChange={handleFormChange} required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Duración por defecto (min)</label>
              <input className="input" type="number" step="30" min="30" name="default_duration_minutes" value={form.default_duration_minutes} onChange={handleFormChange} required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Duración máx. (min)</label>
              <input className="input" type="number" step="30" min="30" name="max_duration_minutes" value={form.max_duration_minutes} onChange={handleFormChange} required />
            </div>
          </div>

          <h4>Checklist de tareas</h4>
          {tasks.map((task, index) => (
            <div key={index} style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <input
                className="input" type="text" placeholder="Nombre de la tarea"
                value={task.name} onChange={(e) => handleTaskChange(index, "name", e.target.value)}
                style={{ flex: 2 }}
              />
              <input
                className="input" type="number" placeholder="Min."
                value={task.estimated_minutes} onChange={(e) => handleTaskChange(index, "estimated_minutes", e.target.value)}
                style={{ flex: 1 }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
                <input
                  type="checkbox" checked={task.is_required}
                  onChange={(e) => handleTaskChange(index, "is_required", e.target.checked)}
                />
                Obligatoria
              </label>
              {tasks.length > 1 && (
                <button type="button" className="btn-danger btn" onClick={() => removeTaskRow(index)}>×</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-outline" onClick={addTaskRow} style={{ marginBottom: "var(--space-4)" }}>
            + Añadir tarea
          </button>

          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button type="submit" className="btn btn-primary">Crear servicio</button>
            <button type="button" className="btn btn-outline" onClick={resetForm}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="empty-state">Cargando...</p>
      ) : (
        <table className="table-clean">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Precio/h</th>
              <th>Duración</th>
              <th>Tareas</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && (
              <tr><td colSpan="6" className="empty-state">No hay servicios creados todavía.</td></tr>
            )}
            {services.map((service) => (
              <tr key={service.service_id}>
                <td>{service.name}</td>
                <td>{Number(service.base_hourly_rate).toFixed(2)} €</td>
                <td>{service.min_duration_minutes}–{service.max_duration_minutes} min</td>
                <td>{service.tasks.length}</td>
                <td>
                  <span className={`badge ${service.is_active ? "badge-success" : "badge-warning"}`}>
                    {service.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-outline" onClick={() => toggleActive(service)}>
                    {service.is_active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};