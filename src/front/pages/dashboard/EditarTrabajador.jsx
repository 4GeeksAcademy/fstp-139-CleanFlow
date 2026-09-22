import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import {
    getWorker,
    updateWorker,
    createWorker,
} from "../../services/workerService";
import { getShifts } from "../../services/shiftService";
import { summarizeDays } from "./ListadoTurnos";
import { WorkerSummary } from "../../components/dashboard/workers/WorkerSummary";
import "../../dashboard.css";

// Los dos roles del equipo, en chips.
const ROLES = [
    { value: "worker", label: "Trabajador" },
    { value: "manager", label: "Encargado" },
];

// Campos grises de cada sección mientras carga.
const SKELETON_SECTIONS = [3, 1, 3];

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

    // El ojo de la contraseña (solo al crear).
    const [showPassword, setShowPassword] = useState(false);

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

    // ------------------------------------------------------------------
    // PANTALLA
    // ------------------------------------------------------------------

    const backLink = (
        <Link to="/dashboard/workers" className="cf-worker-form__back">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Trabajadores
        </Link>
    );

    const lede = isEditing
        ? "Sus datos, su puesto y su turno. Las ausencias se gestionan en su propia página."
        : "Crea su cuenta y asígnale un turno para que pueda recibir reservas.";

    if (loading) {
        return (
            <section className="cf-worker-form" aria-busy="true">
                <div className="cf-worker-form__header">
                    {backLink}
                    <p className="cf-dash-eyebrow">Equipo</p>
                    <h1 className="cf-worker-form__title">
                        {isEditing ? "Editar trabajador" : "Nuevo trabajador"}
                    </h1>
                    <p className="cf-worker-form__lede">{lede}</p>
                </div>

                <p className="sr-only">Cargando datos del trabajador...</p>

                {/* La misma forma que el formulario: tres secciones y el resumen. */}
                <div className="cf-worker-form__editor" aria-hidden="true">
                    <div className="cf-worker-form__form">
                        {SKELETON_SECTIONS.map((fields, index) => (
                            <div className="cf-worker-form__section" key={index}>
                                <span className="cf-dash-skel cf-worker-form__skel-legend" />
                                <div className="cf-worker-form__grid">
                                    {Array.from({ length: fields }, (_, field) => (
                                        <div key={field}>
                                            <span className="cf-dash-skel cf-worker-form__skel-label" />
                                            <span className="cf-dash-skel cf-worker-form__skel-input" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="cf-worker-form__aside">
                        <span className="cf-dash-skel cf-worker-form__skel-legend" />
                        <div className="cf-worker-form__who">
                            <span className="cf-dash-skel cf-skel-avatar" />
                            <div className="cf-workers__who cf-worker-form__skel-head">
                                <span className="cf-dash-skel cf-worker-form__skel-name" />
                                <span className="cf-dash-skel cf-worker-form__skel-sub" />
                            </div>
                        </div>
                        <div className="cf-worker-form__facts">
                            <div>
                                <span className="cf-dash-skel cf-worker-form__skel-sub" />
                                <span className="cf-dash-skel cf-worker-form__skel-fact" />
                            </div>
                            <div>
                                <span className="cf-dash-skel cf-worker-form__skel-sub" />
                                <span className="cf-dash-skel cf-worker-form__skel-fact" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (loadError) {
        return (
            <section className="cf-worker-form">
                <div className="cf-worker-form__header">{backLink}</div>

                <div className="cf-dash-state cf-dash-state--error" role="alert">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">No se han podido cargar los datos</p>
                    <p className="cf-dash-state__text">{loadError}</p>
                    <button
                        type="button"
                        className="cf-dash-btn"
                        onClick={() => navigate("/dashboard/workers")}
                    >
                        Volver a trabajadores
                    </button>
                </div>
            </section>
        );
    }

    // El turno elegido, para el resumen de la derecha.
    const selectedShift = shifts.find(
        (shift) => String(shift.shift_id) === formData.shift_id
    ) || null;

    // Lo que se escribe, más la foto y la valoración que ya tenía.
    const summary = {
        ...formData,
        avatar_url: profile?.avatar_url,
        rating: profile?.rating,
        reviews_count: profile?.reviews_count,
    };

    return (
        <section className="cf-worker-form">
            <div className="cf-worker-form__header">
                {backLink}
                <p className="cf-dash-eyebrow">Equipo</p>
                {/* El nombre de la carga, no el del formulario: así el título
                    no cambia mientras se escribe. */}
                <h1 className="cf-worker-form__title">
                    {!isEditing
                        ? "Nuevo trabajador"
                        : profile
                            ? `Editar a ${profile.name} ${profile.last_name}`
                            : "Editar trabajador"}
                </h1>
                <p className="cf-worker-form__lede">{lede}</p>
            </div>

            <div className="cf-worker-form__editor">
                <form onSubmit={handleSubmit} className="cf-worker-form__form">
                    {formError && (
                        <p className="cf-dash-alert" role="alert">
                            {formError}
                        </p>
                    )}

                    {/* ---------- DATOS PERSONALES ---------- */}
                    <fieldset className="cf-worker-form__section" disabled={saving}>
                        <legend className="cf-worker-form__legend">Datos personales</legend>
                        <div className="cf-worker-form__grid">
                            <div className="cf-dash-field">
                                <label className="cf-dash-field__label" htmlFor="worker-name">Nombre</label>
                                <input id="worker-name" className="cf-dash-input" type="text" name="name"
                                    value={formData.name} onChange={handleChange} required autoComplete="off" />
                            </div>
                            <div className="cf-dash-field">
                                <label className="cf-dash-field__label" htmlFor="worker-last_name">Apellidos</label>
                                <input id="worker-last_name" className="cf-dash-input" type="text" name="last_name"
                                    value={formData.last_name} onChange={handleChange} required autoComplete="off" />
                            </div>
                            <div className="cf-dash-field">
                                <label className="cf-dash-field__label" htmlFor="worker-phone">
                                    Teléfono
                                    {isEditing && <span className="cf-dash-field__optional"> (opcional)</span>}
                                </label>
                                <input id="worker-phone" className="cf-dash-input" type="tel" name="phone"
                                    value={formData.phone} onChange={handleChange} required={!isEditing} autoComplete="off" />
                            </div>
                        </div>
                    </fieldset>

                    {/* ---------- ACCESO ---------- */}
                    <fieldset className="cf-worker-form__section" disabled={saving}>
                        <legend className="cf-worker-form__legend">Acceso</legend>
                        <div className="cf-worker-form__grid">
                            <div className="cf-dash-field">
                                <label className="cf-dash-field__label" htmlFor="worker-email">Correo</label>
                                <input id="worker-email" className="cf-dash-input" type="email" name="email"
                                    value={formData.email} onChange={handleChange} required autoComplete="off"
                                    aria-describedby="worker-email-note" />
                                <p className="cf-dash-field__note" id="worker-email-note">
                                    {isEditing
                                        ? "Con él entra en la aplicación. La contraseña la cambia la propia persona en Ajustes."
                                        : "Con él entrará en la aplicación."}
                                </p>
                            </div>

                            {/* Solo al crear: después, la contraseña es cosa de cada uno. */}
                            {!isEditing && (
                                <div className="cf-dash-field">
                                    <label className="cf-dash-field__label" htmlFor="worker-password">
                                        Contraseña inicial
                                    </label>
                                    <div className="cf-account__password">
                                        <input id="worker-password" className="cf-dash-input"
                                            type={showPassword ? "text" : "password"} name="password"
                                            value={formData.password} onChange={handleChange}
                                            minLength={6} autoComplete="new-password" required
                                            aria-describedby="worker-password-note" />
                                        <button type="button" className="cf-account__eye"
                                            onClick={() => setShowPassword((shown) => !shown)}
                                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                            aria-pressed={showPassword}>
                                            <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
                                        </button>
                                    </div>
                                    <p className="cf-dash-field__note" id="worker-password-note">
                                        Mínimo 6 caracteres. Compártela con la persona: podrá cambiarla en Ajustes.
                                    </p>
                                </div>
                            )}
                        </div>
                    </fieldset>

                    {/* ---------- TRABAJO ---------- */}
                    <fieldset className="cf-worker-form__section" disabled={saving}>
                        <legend className="cf-worker-form__legend">Trabajo</legend>
                        <div className="cf-worker-form__grid">
                            {/* Chips y no un select: son dos opciones y se ven de golpe. */}
                            <div className="cf-dash-field cf-worker-form__wide">
                                <span className="cf-dash-field__label" id="worker-role-label">Rol</span>
                                <div className="cf-dash-chips" role="radiogroup" aria-labelledby="worker-role-label">
                                    {ROLES.map((role) => (
                                        <label className="cf-dash-chip" key={role.value}>
                                            <input type="radio" name="role" value={role.value}
                                                checked={formData.role === role.value} onChange={handleChange} />
                                            <span>{role.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="cf-dash-field__note">
                                    El encargado entra al panel de gestión: equipo, turnos y catálogo.
                                </p>
                            </div>

                            <div className="cf-dash-field">
                                <label className="cf-dash-field__label" htmlFor="worker-position">
                                    Puesto <span className="cf-dash-field__optional">(opcional)</span>
                                </label>
                                <input id="worker-position" className="cf-dash-input" type="text" name="position"
                                    value={formData.position} onChange={handleChange} placeholder="Limpiadora, cristalero..." />
                            </div>
                            <div className="cf-dash-field">
                                <label className="cf-dash-field__label" htmlFor="worker-hire_date">
                                    En el equipo desde <span className="cf-dash-field__optional">(opcional)</span>
                                </label>
                                <input id="worker-hire_date" className="cf-dash-input" type="date" name="hire_date"
                                    value={formData.hire_date} onChange={handleChange} />
                            </div>

                            {/* Tarjetas y no un select: el horario y los días se ven sin ir a Turnos. */}
                            <div className="cf-dash-field cf-worker-form__wide">
                                <span className="cf-dash-field__label" id="worker-shift-label">Turno</span>
                                <div className="cf-worker-form__shifts" role="radiogroup" aria-labelledby="worker-shift-label">
                                    {shifts.map((shift) => (
                                        <label className="cf-worker-form__shift" key={shift.shift_id}>
                                            <input type="radio" name="shift_id" value={String(shift.shift_id)}
                                                checked={formData.shift_id === String(shift.shift_id)} onChange={handleChange} />
                                            <span className="cf-worker-form__shift-name">
                                                {shift.name}
                                                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                            </span>
                                            <span className="cf-worker-form__shift-hours">
                                                {shift.start_time}–{shift.end_time} · {summarizeDays(shift.work_days)}
                                                {/* Un turno desactivado no ofrece huecos. */}
                                                {shift.is_active ? "" : " · desactivado"}
                                            </span>
                                        </label>
                                    ))}

                                    <label className="cf-worker-form__shift">
                                        <input type="radio" name="shift_id" value=""
                                            checked={formData.shift_id === ""} onChange={handleChange} />
                                        <span className="cf-worker-form__shift-name">
                                            Sin turno
                                            <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                        </span>
                                        <span className="cf-worker-form__shift-hours">No recibirá reservas</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* ---------- ESTADO (solo al editar: se nace activo) ---------- */}
                    {isEditing && (
                        <fieldset className="cf-worker-form__section" disabled={saving}>
                            <legend className="cf-worker-form__legend">Estado</legend>
                            <div className="cf-worker-form__status">
                                <p>
                                    <strong>{formData.is_active ? "Activo" : "Desactivado"}</strong>
                                    {formData.is_active
                                        ? "Si lo desactivas, no podrá entrar ni recibir reservas, y sus reservas pendientes pasarán a Reservas afectadas."
                                        : "No puede entrar ni recibir reservas. Actívalo para que vuelva a salir libre."}
                                </p>
                                <label className="cf-dash-switch" htmlFor="worker-status">
                                    <input id="worker-status" type="checkbox" role="switch" name="is_active"
                                        checked={formData.is_active} onChange={handleChange} />
                                    <span className="cf-dash-switch__text">
                                        {formData.is_active ? "Activo" : "Desactivado"}
                                    </span>
                                </label>
                            </div>
                        </fieldset>
                    )}

                    <div className="cf-worker-form__actions">
                        <button type="submit" className="cf-dash-btn" disabled={saving}>
                            {!isEditing && <i className="fa-solid fa-user-plus" aria-hidden="true" />}
                            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear trabajador"}
                        </button>
                        <button
                            type="button"
                            className="cf-dash-btn cf-dash-btn--ghost"
                            onClick={() => navigate("/dashboard/workers")}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>

                <WorkerSummary
                    worker={summary}
                    shift={selectedShift}
                    isEditing={isEditing}
                    onAbsences={
                        isEditing && formData.role === "worker"
                            ? () => navigate(`/dashboard/workers/${workerId}/absences`)
                            : null
                    }
                />
            </div>
        </section>
    );
};
