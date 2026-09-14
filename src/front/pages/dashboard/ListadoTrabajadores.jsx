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
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
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

    const loadWorkers = async () => {
        setLoading(true);
        setError("");

        const result = await getWorkers(store.token);

        if (result.ok) {
            setWorkers(result.data.workers);
        } else {
            setError(result.error || "No se han podido cargar los trabajadores");
        }

        setLoading(false);
    };

    useEffect(() => {
        if (store.token) {
            loadWorkers();
        }
    }, [store.token]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleEdit = (worker) => {
        setEditingWorker(worker);
        setFormError("");

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
            is_active: worker.is_active,
        });

        setShowForm(true);
    };

    const handleNewWorker = () => {
        setEditingWorker(null);
        setFormError("");

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
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingWorker(null);
        setFormError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setSaving(true);
        setFormError("");

        const workerData = {
            name: formData.name,
            last_name: formData.last_name,
            phone: formData.phone,
            email: formData.email,
            role: formData.role,
            position: formData.position,
            shift_id: formData.shift_id
                ? Number(formData.shift_id)
                : null,
            hire_date: formData.hire_date || null,
            is_active: formData.is_active,
        };

        let result;

        if (editingWorker) {
            result = await updateWorker(
                store.token,
                editingWorker.worker_id,
                workerData
            );
        } else {
            workerData.password = formData.password;

            result = await createWorker(
                store.token,
                workerData
            );
        }

        if (!result.ok) {
            setFormError(
                result.data?.message ||
                result.data?.error ||
                result.error ||
                "Ha ocurrido un error al guardar"
            );

            setSaving(false);
            return;
        }

        if (editingWorker) {
            setWorkers((currentWorkers) =>
                currentWorkers.map((worker) =>
                    worker.worker_id === editingWorker.worker_id
                        ? {
                            ...worker,
                            ...result.data,
                            shift_name: result.data.shift_name,
                        }
                        : worker
                )
            );
        } else {
            setWorkers((currentWorkers) => [
                ...currentWorkers,
                result.data,
            ]);
        }

        setShowForm(false);
        setEditingWorker(null);
        setSaving(false);
    };

    const managers = workers.filter(
        (worker) => worker.role === "manager"
    );

    const regularWorkers = workers.filter(
        (worker) => worker.role === "worker"
    );

    const renderWorkerRow = (worker) => (
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
                {worker.is_active ? (
                    <span className="text-success fw-bold">
                        Activo
                    </span>
                ) : (
                    <span className="text-danger fw-bold">
                        Inactivo
                    </span>
                )}
            </td>

            <td>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleEdit(worker)}
                >
                    Editar
                </button>
            </td>
        </tr>
    );

    if (loading) {
        return (
            <div className="container mt-4">
                <h1>Gestión de personal</h1>
                <p>Cargando trabajadores...</p>
            </div>
        );
    }

    return (
        <div className="container mt-4 mb-5">

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1>Gestión de personal</h1>
                    <p className="text-muted mb-0">
                        Gestiona encargados y trabajadores.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleNewWorker}
                >
                    Añadir nuevo trabajador
                </button>
            </div>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            {/* ========================= */}
            {/* TABLA DE ENCARGADOS */}
            {/* ========================= */}

            <div className="card mb-5">
                <div className="card-header">
                    <h2 className="h4 mb-0">
                        Encargados
                    </h2>
                </div>

                <div className="card-body">

                    {managers.length === 0 ? (
                        <p className="text-muted mb-0">
                            No hay encargados registrados.
                        </p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped table-hover align-middle">
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
                                    {managers.map(renderWorkerRow)}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>
            </div>

            {/* ========================= */}
            {/* TABLA DE TRABAJADORES */}
            {/* ========================= */}

            <div className="card">
                <div className="card-header">
                    <h2 className="h4 mb-0">
                        Trabajadores
                    </h2>
                </div>

                <div className="card-body">

                    {regularWorkers.length === 0 ? (
                        <p className="text-muted mb-0">
                            No hay trabajadores registrados.
                        </p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped table-hover align-middle">
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
                                    {regularWorkers.map(renderWorkerRow)}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>
            </div>

            {/* ========================= */}
            {/* FORMULARIO / MODAL */}
            {/* ========================= */}

            {showForm && (
                <div
                    className="modal d-block"
                    tabIndex="-1"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                    }}
                >
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">

                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {editingWorker
                                        ? "Editar personal"
                                        : "Añadir nuevo trabajador"}
                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleCancel}
                                ></button>
                            </div>

                            <form onSubmit={handleSubmit}>

                                <div className="modal-body">

                                    {formError && (
                                        <div className="alert alert-danger">
                                            {formError}
                                        </div>
                                    )}

                                    <div className="row">

                                        {/* NOMBRE */}
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">
                                                Nombre
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        {/* APELLIDOS */}
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">
                                                Apellidos
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control"
                                                name="last_name"
                                                value={formData.last_name}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        {/* TELÉFONO */}
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">
                                                Teléfono
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        {/* EMAIL */}
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">
                                                Email
                                            </label>

                                            <input
                                                type="email"
                                                className="form-control"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        {/* PASSWORD - SOLO CREACIÓN */}
                                        {!editingWorker && (
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">
                                                    Contraseña
                                                </label>

                                                <input
                                                    type="password"
                                                    className="form-control"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    minLength="6"
                                                    required
                                                />
                                            </div>
                                        )}

                                        {/* ROL */}
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">
                                                Rol
                                            </label>

                                            <select
                                                className="form-select"
                                                name="role"
                                                value={formData.role}
                                                onChange={handleChange}
                                                required
                                            >
                                                <option value="worker">
                                                    Trabajador
                                                </option>

                                                <option value="manager">
                                                    Encargado
                                                </option>
                                            </select>
                                        </div>

                                        {/* PUESTO */}
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">
                                                Puesto
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control"
                                                name="position"
                                                value={formData.position}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        {/* TURNO */}
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">
                                                ID del turno
                                            </label>

                                            <input
                                                type="number"
                                                className="form-control"
                                                name="shift_id"
                                                value={formData.shift_id}
                                                onChange={handleChange}
                                                min="1"
                                            />
                                        </div>

                                        {/* FECHA CONTRATACIÓN */}
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">
                                                Fecha de contratación
                                            </label>

                                            <input
                                                type="date"
                                                className="form-control"
                                                name="hire_date"
                                                value={formData.hire_date}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        {/* ESTADO SOLO AL EDITAR */}
                                        {editingWorker && (
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">
                                                    Estado
                                                </label>

                                                <select
                                                    className="form-select"
                                                    name="is_active"
                                                    value={
                                                        formData.is_active
                                                            ? "true"
                                                            : "false"
                                                    }
                                                    onChange={(event) =>
                                                        setFormData({
                                                            ...formData,
                                                            is_active:
                                                                event.target.value ===
                                                                "true",
                                                        })
                                                    }
                                                >
                                                    <option value="true">
                                                        Activo
                                                    </option>

                                                    <option value="false">
                                                        Inactivo
                                                    </option>
                                                </select>
                                            </div>
                                        )}

                                    </div>
                                </div>

                                <div className="modal-footer">

                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleCancel}
                                        disabled={saving}
                                    >
                                        Cancelar
                                    </button>

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

                                </div>

                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

};
