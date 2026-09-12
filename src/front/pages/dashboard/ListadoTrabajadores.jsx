import { useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import {
    getWorkers,
    createWorker,
    updateWorker,
} from "../../services/workerService";

export const ListadoTrabajadores = () => {
    const { store } = useGlobalReducer();

    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        last_name: "",
        phone: "",
        email: "",
        password: "",
        role: "worker",
        position: "",
        shift_id: "",
        hire_date: "",
        is_active: true,
    });

    useEffect(() => {
        const loadWorkers = async () => {
            const result = await getWorkers(store.token);

            if (!result.ok) {
                setError(
                    result.data?.message ||
                    result.data?.error ||
                    "No se han podido cargar los trabajadores."
                );
                setLoading(false);
                return;
            }

            setWorkers(result.data);
            setLoading(false);
        };

        if (store.token) {
            loadWorkers();
        } else {
            setLoading(false);
            setError("No hay una sesión activa.");
        }
    }, [store.token]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setFormError("");
        setSaving(true);

        const workerData = {
            name: formData.name,
            last_name: formData.last_name,
            phone: formData.phone,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            position: formData.position,
            shift_id: formData.shift_id
                ? Number(formData.shift_id)
                : null,
            hire_date: formData.hire_date || null,
            is_active: formData.is_active,
        };

        try {
            if (editingWorker) {
                // EDITAR
                const result = await updateWorker(
                    store.token,
                    editingWorker.worker_id,
                    {
                        name: workerData.name,
                        last_name: workerData.last_name,
                        phone: workerData.phone,
                        email: workerData.email,
                        position: workerData.position,
                        shift_id: workerData.shift_id,
                        hire_date: workerData.hire_date,
                        is_active: workerData.is_active,
                        role: workerData.role,
                    }
                );

                if (!result.ok) {
                    setFormError(
                        result.data?.message ||
                        result.data?.error ||
                        "No se ha podido actualizar el trabajador."
                    );
                    setSaving(false);
                    return;
                }

                setWorkers((currentWorkers) =>
                    currentWorkers.map((worker) =>
                        worker.worker_id === editingWorker.worker_id
                            ? {
                                ...worker,
                                name: result.data.name,
                                last_name: result.data.last_name,
                                phone: result.data.phone,
                                email: result.data.email,
                                position: result.data.position,
                                shift_id: result.data.shift_id,
                                hire_date: result.data.hire_date,
                                is_active: result.data.is_active,
                                role: result.data.role,
                            }
                            : worker
                    )
                );

                setEditingWorker(null);
            } else {
                // CREAR
                const result = await createWorker(
                    store.token,
                    workerData
                );

                if (!result.ok) {
                    setFormError(
                        result.data?.message ||
                        result.data?.error ||
                        "No se ha podido crear el trabajador."
                    );
                    setSaving(false);
                    return;
                }

                setWorkers((currentWorkers) => [
                    ...currentWorkers,
                    result.data,
                ]);
            }

            setFormData({
                name: "",
                last_name: "",
                phone: "",
                email: "",
                password: "",
                role: "worker",
                position: "",
                shift_id: "",
                hire_date: "",
                is_active: true,
            });

            setShowForm(false);
            setSaving(false);

        } catch (error) {
            console.error(error);
            setFormError("Ha ocurrido un error inesperado.");
            setSaving(false);
        }
    };

    if (loading) {
        return <p>Cargando trabajadores...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <div className="container py-4">

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="mb-0">Trabajadores</h1>

                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setEditingWorker(null);
                        setFormData({
                            name: "",
                            last_name: "",
                            phone: "",
                            email: "",
                            password: "",
                            role: "worker",
                            position: "",
                            shift_id: "",
                            hire_date: "",
                            is_active: true,
                        });
                        setShowForm(true);
                        setFormError("");
                    }}
                >
                    Añadir nuevo trabajador
                </button>
            </div>

            {showForm && (
                <div className="card mb-4">
                    <div className="card-body">
                        <h2 className="h4 mb-4">
                            {editingWorker ? "Editar trabajador" : "Nuevo trabajador"}
                        </h2>

                        {formError && (
                            <div className="alert alert-danger">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>

                            <div className="row">

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Nombre
                                    </label>

                                    <input
                                        type="text"
                                        name="name"
                                        className="form-control"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Apellidos
                                    </label>

                                    <input
                                        type="text"
                                        name="last_name"
                                        className="form-control"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Teléfono
                                    </label>

                                    <input
                                        type="tel"
                                        name="phone"
                                        className="form-control"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        className="form-control"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                {!editingWorker && (
                                    <div className="mb-3">
                                        <label className="form-label">Contraseña</label>
                                        <input
                                            type="password"
                                            name="password"
                                            className="form-control"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                )}
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Rol
                                    </label>

                                    <select
                                        name="role"
                                        className="form-select"
                                        value={formData.role}
                                        onChange={handleChange}
                                    >
                                        <option value="worker">Trabajador</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Puesto
                                    </label>

                                    <input
                                        type="text"
                                        name="position"
                                        className="form-control"
                                        value={formData.position}
                                        onChange={handleChange}
                                        placeholder="Ej. Limpiador/a"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        ID del turno
                                    </label>

                                    <input
                                        type="number"
                                        name="shift_id"
                                        className="form-control"
                                        value={formData.shift_id}
                                        onChange={handleChange}
                                        min="1"
                                        placeholder="Ej. 1"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Fecha de contratación
                                    </label>

                                    <input
                                        type="date"
                                        name="hire_date"
                                        className="form-control"
                                        value={formData.hire_date}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Estado
                                    </label>

                                    <select
                                        name="is_active"
                                        className="form-select"
                                        value={formData.is_active ? "true" : "false"}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                is_active: event.target.value === "true",
                                            })
                                        }
                                    >
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo</option>
                                    </select>
                                </div>

                            </div>

                            <div className="d-flex gap-2 mt-3">

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Guardando..."
                                        : editingWorker
                                            ? "Guardar cambios"
                                            : "Crear trabajador"}
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowForm(false);
                                        setFormError("");
                                        setEditingWorker(null);
                                    }}
                                >
                                    Cancelar
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}

            {workers.length === 0 ? (
                <p>No hay trabajadores registrados.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-striped table-bordered">

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
                            {workers.map((worker) => (
                                <tr key={worker.worker_id}>
                                    <td>
                                        {worker.name} {worker.last_name}
                                    </td>

                                    <td>
                                        {worker.position || "Sin puesto"}
                                    </td>

                                    <td>
                                        {worker.shift_name || "Sin turno"}
                                    </td>

                                    <td>
                                        {worker.is_active
                                            ? "Activo"
                                            : "Inactivo"}
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => {
                                                setEditingWorker(worker);

                                                setFormData({
                                                    name: worker.name || "",
                                                    last_name: worker.last_name || "",
                                                    phone: worker.phone || "",
                                                    email: worker.email || "",
                                                    password: "",
                                                    role: worker.role || "worker",
                                                    position: worker.position || "",
                                                    shift_id: worker.shift_id || "",
                                                    hire_date: worker.hire_date || "",
                                                    is_active: worker.is_active ?? true,
                                                });

                                                setFormError("");
                                                setShowForm(true);
                                            }}
                                        >
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                    </table>
                </div>
            )}

        </div>
    );
};