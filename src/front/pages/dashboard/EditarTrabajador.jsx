import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import {
    getWorker,
    updateWorker,
    createWorker,
} from "../../services/workerService";
import { getShifts } from "../../services/shiftService";

import { WorkerAbsences } from "../../components/dashboard/WorkerAbsences";

export const EditarTrabajador = () => {
    const { store } = useGlobalReducer();
    const { workerId } = useParams();
    const isEditing = Boolean(workerId);
    const navigate = useNavigate();

    const [formData, setFormData] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            setLoading(true);
            setLoadError("");
            setFormError("");

            if (!store.token) {
                setLoadError("Debes iniciar sesión.");
                setLoading(false);
                return;
            }

            const [workerResult, shiftsResult] = await Promise.all([
                isEditing
                    ? getWorker(store.token, workerId)
                    : Promise.resolve({ ok: true, data: null }),
                getShifts(store.token),
            ]);

            if (!active) return;

            if (!workerResult.ok || !shiftsResult.ok) {
                const failedResult = !workerResult.ok
                    ? workerResult
                    : shiftsResult;

                setLoadError(
                    failedResult.data?.message ||
                    failedResult.data?.error ||
                    failedResult.data?.msg ||
                    "No se han podido cargar los datos del formulario."
                );

                setLoading(false);
                return;
            }

            const worker = workerResult.data;

            setFormData({
                name: worker?.name || "",
                last_name: worker?.last_name || "",
                phone: worker?.phone || "",
                email: worker?.email || "",
                password: "",
                role: worker?.role || "worker",
                position: worker?.position || "",
                shift_id: worker?.shift_id == null
                    ? ""
                    : String(worker.shift_id),
                hire_date: worker?.hire_date || "",
                is_active: worker?.is_active ?? true,
            });

            setShifts(shiftsResult.data);
            setLoading(false);
        };

        loadData();

        return () => {
            active = false;
        };
    }, [store.token, workerId, isEditing]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: name === "is_active"
                ? value === "true"
                : value,
        }));

        setFormError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving) return;

        setFormError("");

        if (!formData.name.trim() || !formData.last_name.trim()) {
            setFormError("El nombre y los apellidos son obligatorios.");
            return;
        }

        if (!isEditing && !formData.phone.trim()) {
            setFormError("El teléfono es obligatorio.");
            return;
        }

        setSaving(true);

        const workerData = {
            name: formData.name.trim(),
            last_name: formData.last_name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim(),
            role: formData.role,
            position: formData.position,
            shift_id: formData.shift_id === ""
                ? null
                : Number(formData.shift_id),
            hire_date: formData.hire_date || null,
        };

        let result;

        if (isEditing) {
            workerData.is_active = formData.is_active;

            result = await updateWorker(
                store.token,
                workerId,
                workerData
            );
        } else {
            workerData.password = formData.password;

            result = await createWorker(
                store.token,
                workerData
            );
        }

        if (result.ok) {
            navigate("/dashboard/workers");
            return;
        }

        setFormError(
            result.data?.message ||
            result.data?.error ||
            result.data?.msg ||
            "No se han podido guardar los datos."
        );

        setSaving(false);
    };

    if (loading) {
        return <p>Cargando datos del trabajador...</p>;
    }

    if (loadError) {
        return (
            <div>
                <div className="alert alert-danger" role="alert">
                    {loadError}
                </div>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate("/dashboard/workers")}
                >
                    Volver a trabajadores
                </button>
            </div>
        );
    }

    const fields = [
        { name: "name", label: "Nombre", type: "text", required: true },
        { name: "last_name", label: "Apellidos", type: "text", required: true },
        {
            name: "phone",
            label: "Teléfono",
            type: "tel",
            required: !isEditing,
        },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "position", label: "Puesto", type: "text" },
        { name: "hire_date", label: "Fecha de contratación", type: "date" },
    ];

    return (
        <div className="container mt-4 mb-5">
            <h1 className="mb-4">
                {isEditing ? "Editar trabajador" : "Añadir nuevo trabajador"}
            </h1>

            <form onSubmit={handleSubmit} className="card p-4">
                {formError && (
                    <div className="alert alert-danger" role="alert">
                        {formError}
                    </div>
                )}

                <fieldset disabled={saving}>
                    <div className="row">
                        {!isEditing && (
                            <div className="col-md-6 mb-3">
                                <label htmlFor="worker-password" className="form-label">
                                    Contraseña
                                </label>
                                <input
                                    id="worker-password"
                                    className="form-control"
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    minLength={6}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        )}
                        {fields.map((field) => (
                            <div className="col-md-6 mb-3" key={field.name}>
                                <label
                                    htmlFor={`worker-${field.name}`}
                                    className="form-label"
                                >
                                    {field.label}
                                </label>
                                <input
                                    id={`worker-${field.name}`}
                                    className="form-control"
                                    type={field.type}
                                    name={field.name}
                                    value={formData[field.name]}
                                    onChange={handleChange}
                                    required={field.required}
                                />
                            </div>
                        ))}

                        <div className="col-md-6 mb-3">
                            <label htmlFor="worker-role" className="form-label">
                                Rol
                            </label>
                            <select
                                id="worker-role"
                                className="form-select"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="worker">Trabajador</option>
                                <option value="manager">Encargado</option>
                            </select>
                        </div>

                        <div className="col-md-6 mb-3">
                            <label htmlFor="worker-shift" className="form-label">
                                Turno
                            </label>
                            <select
                                id="worker-shift"
                                className="form-select"
                                name="shift_id"
                                value={formData.shift_id}
                                onChange={handleChange}
                            >
                                <option value="">Sin turno</option>
                                {shifts.map((shift) => (
                                    <option
                                        key={shift.shift_id}
                                        value={shift.shift_id}
                                    >
                                        {shift.name} ({shift.start_time} – {shift.end_time})
                                        {/* Aviso: un turno desactivado no ofrece huecos */}
                                        {shift.is_active ? "" : " · desactivado"}
                                    </option>
                                ))}
                            </select>
                            {shifts.length === 0 && (
                                <p className="text-muted mt-2 mb-0">
                                    Todavía no hay turnos creados.
                                </p>
                            )}
                        </div>

                        <div className="col-md-6 mb-3">
                            <label htmlFor="worker-status" className="form-label">
                                Estado
                            </label>
                            <select
                                id="worker-status"
                                className="form-select"
                                name="is_active"
                                value={String(formData.is_active)}
                                onChange={handleChange}
                                disabled={!isEditing}
                            >
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-primary">
                            {saving
                                ? "Guardando..."
                                : isEditing
                                    ? "Guardar cambios"
                                    : "Crear trabajador"}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate("/dashboard/workers")}
                        >
                            Cancelar
                        </button>
                    </div>
                </fieldset>
            </form>
            {isEditing && <WorkerAbsences key={workerId} workerId={workerId} token={store.token} />}
        </div>
    );
};