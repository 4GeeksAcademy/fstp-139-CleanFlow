import { useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import {
    getShifts,
    createShift,
    updateShift,
    deleteShift,
} from "../../services/shiftService";
export const ListadoTurnos = () => {
    const { store } = useGlobalReducer();

    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        start_time: "",
        end_time: "",
    });

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [success, setSuccess] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [deleteError, setDeleteError] = useState("");


    useEffect(() => {
        let active = true;

        const loadShifts = async () => {
            if (!store.token) {
                setLoading(false);
                setError("Debes iniciar sesión para consultar los turnos.");
                return;
            }

            setLoading(true);
            setError("");

            const result = await getShifts(store.token);

            if (!active) return;

            if (result.ok) {
                setShifts(result.data);
            } else {
                setError(
                    result.data?.message ||
                    result.data?.msg ||
                    "No se han podido cargar los turnos."
                );
            }

            setLoading(false);
        };

        loadShifts();

        return () => {
            active = false;
        };
    }, [store.token]);
    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        setFormError("");
        setSuccess("");
    };
    const handleEdit = (shift) => {
        setEditingId(shift.shift_id);

        setFormData({
            name: shift.name,
            start_time: shift.start_time,
            end_time: shift.end_time,
        });

        setFormError("");
        setSuccess("");
    };

    const handleCancel = () => {
        setEditingId(null);

        setFormData({
            name: "",
            start_time: "",
            end_time: "",
        });

        setFormError("");
        setSuccess("");
    };
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving) return;

        setFormError("");
        setSuccess("");

        if (!formData.name.trim()) {
            setFormError("El nombre del turno es obligatorio.");
            return;
        }

        if (formData.start_time >= formData.end_time) {
            setFormError("La hora de fin debe ser posterior a la de inicio.");
            return;
        }

        setSaving(true);

        const shiftData = {
            ...formData,
            name: formData.name.trim(),
        };

        const isEditing = editingId !== null;

        const result = isEditing
            ? await updateShift(store.token, editingId, shiftData)
            : await createShift(store.token, shiftData);

        if (result.ok) {
            setShifts((previous) => {
                const updatedShifts = isEditing
                    ? previous.map((shift) =>
                        shift.shift_id === editingId ? result.data : shift
                    )
                    : [...previous, result.data];

                return updatedShifts.sort((a, b) =>
                    a.start_time.localeCompare(b.start_time)
                );
            });

            setEditingId(null);

            setFormData({
                name: "",
                start_time: "",
                end_time: "",
            });

            setSuccess(
                isEditing
                    ? "Turno actualizado correctamente."
                    : "Turno creado correctamente."
            );
        } else {
            setFormError(
                result.data?.message ||
                result.data?.msg ||
                "No se ha podido guardar el turno."
            );
        }

        setSaving(false);
    };
    const handleDelete = async (shift) => {
        if (saving || deletingId !== null) return;

        const confirmed = window.confirm(
            `¿Quieres eliminar el turno "${shift.name}"?`
        );

        if (!confirmed) return;

        setDeletingId(shift.shift_id);
        setDeleteError("");
        setSuccess("");

        const result = await deleteShift(store.token, shift.shift_id);

        if (result.ok) {
            setShifts((previous) =>
                previous.filter(
                    (item) => item.shift_id !== shift.shift_id
                )
            );

            if (editingId === shift.shift_id) {
                handleCancel();
            }

            setSuccess("Turno eliminado correctamente.");
        } else {
            setDeleteError(
                result.data?.message ||
                result.data?.msg ||
                "No se ha podido eliminar el turno."
            );
        }

        setDeletingId(null);
    };
    return (
        <div>
            <h1 className="mb-4">Turnos</h1>
            <form onSubmit={handleSubmit} className="card p-4 mb-4">
                <h2 className="h5 mb-3">
                    {editingId !== null ? "Editar turno" : "Crear turno"}
                </h2>

                {formError && (
                    <div className="alert alert-danger" role="alert">
                        {formError}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success" role="status">
                        {success}
                    </div>
                )}

                <fieldset disabled={saving || loading || Boolean(error) || deletingId !== null}>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label htmlFor="shift-name" className="form-label">
                                Nombre
                            </label>
                            <input
                                id="shift-name"
                                className="form-control"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Por ejemplo, Tarde"
                                maxLength={50}
                                required
                            />
                        </div>

                        <div className="col-md-4">
                            <label htmlFor="shift-start" className="form-label">
                                Hora de inicio
                            </label>
                            <input
                                id="shift-start"
                                className="form-control"
                                type="time"
                                name="start_time"
                                value={formData.start_time}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="col-md-4">
                            <label htmlFor="shift-end" className="form-label">
                                Hora de fin
                            </label>
                            <input
                                id="shift-end"
                                className="form-control"
                                type="time"
                                name="end_time"
                                value={formData.end_time}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="d-flex gap-2 mt-3">
                        <button type="submit" className="btn btn-primary">
                            {saving
                                ? "Guardando..."
                                : editingId !== null
                                    ? "Guardar cambios"
                                    : "Crear turno"}
                        </button>

                        {editingId !== null && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleCancel}
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </fieldset>
            </form>
            {deleteError && (
                <div className="alert alert-danger" role="alert">
                    {deleteError}
                </div>
            )}

            {loading ? (
                <p>Cargando turnos...</p>
            ) : error ? (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            ) : shifts.length === 0 ? (
                <p>Todavía no hay turnos creados.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-striped align-middle">
                        <thead>
                            <tr>
                                <th scope="col">Nombre</th>
                                <th scope="col">Hora de inicio</th>
                                <th scope="col">Hora de fin</th>
                                <th scope="col">Trabajadores asignados</th>
                                <th scope="col">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shifts.map((shift) => (
                                <tr key={shift.shift_id}>
                                    <td>{shift.name}</td>
                                    <td>{shift.start_time}</td>
                                    <td>{shift.end_time}</td>
                                    <td>
                                        {shift.workers?.length > 0 ? (
                                            <ul className="list-unstyled mb-0">
                                                {shift.workers.map((worker) => (
                                                    <li key={worker.worker_id}>
                                                        {worker.name} {worker.last_name}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-muted">Sin asignar</span>
                                        )}
                                    </td>
                                    <td>

                                        <div className="d-flex gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => handleEdit(shift)}
                                                disabled={saving || deletingId !== null}
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => handleDelete(shift)}
                                                disabled={saving || deletingId !== null}
                                            >
                                                {deletingId === shift.shift_id
                                                    ? "Eliminando..."
                                                    : "Eliminar"}
                                            </button>
                                        </div>
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