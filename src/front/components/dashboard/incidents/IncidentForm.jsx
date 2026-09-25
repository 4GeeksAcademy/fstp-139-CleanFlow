/**
 * FORMULARIO DE UNA INCIDENCIA.
 *
 * Lo que el trabajador rellena para contar que algo ha pasado. Sirve
 * para dos cosas distintas:
 *
 *   · abrir una incidencia sin más, con su tipo
 *   · marcar el servicio como no realizado, donde el tipo no se pregunta
 *     (siempre es de cliente) y hay un aviso de que no se deshace
 *
 * Es un <dialog> de verdad: el navegador oscurece el fondo, atrapa el
 * foco dentro y cierra con Escape sin escribir una línea.
 *
 * Solo pinta y avisa con onSubmit; quien llama a la API es la página.
 *
 * Estilos: dashboard.css, sección 11 (cf-inc-sheet).
 */

import { useEffect, useRef, useState } from "react";

// Lo mismo que acepta el backend.
const MAX_LENGTH = 500;

// Las dos procedencias, dichas como se dicen. Lo que se guarda sigue
// siendo "client" y "company"; los ejemplos están para elegir por lo que
// pasó y no por una etiqueta que suena a repartir culpas.
const TYPES = [
    {
        value: "client",
        icon: "fa-location-dot",
        label: "Por algo del cliente",
        example: "No estaba, no pude entrar, pidió algo que no contrató…",
    },
    {
        value: "company",
        icon: "fa-house",
        label: "Por algo nuestro",
        example: "Falta material, se ha roto algo, he llegado tarde…",
    },
];

export const IncidentForm = ({ open, tasks = [], notDone = false, saving, onSubmit, onClose }) => {
    const dialog = useRef(null);
    const input = useRef(null);

    const [incidentType, setIncidentType] = useState(null);
    const [description, setDescription] = useState("");
    const [taskId, setTaskId] = useState("");
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);

    // Abrir y cerrar lo decide la prop: el dialog solo obedece.
    useEffect(() => {
        if (!dialog.current) return;

        if (open && !dialog.current.open) dialog.current.showModal();
        if (!open && dialog.current.open) dialog.current.close();
    }, [open]);

    // Al cerrarse se vacía: la próxima vez que se abra no debe aparecer
    // lo que se escribió y no se envió.
    useEffect(() => {
        if (open) return;

        setIncidentType(null);
        setDescription("");
        setTaskId("");
        setPhoto(null);
        setPreview(null);
    }, [open]);

    // createObjectURL reserva memoria hasta que se suelta.
    useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview);
    }, [preview]);

    const handlePick = (event) => {
        const [file] = event.target.files;

        if (!file) return;

        setPhoto(file);
        setPreview(URL.createObjectURL(file));

        // Se limpia: si no, elegir el mismo archivo otra vez no dispara
        // el evento y no se podría reintentar.
        event.target.value = "";
    };

    const dropPhoto = () => {
        setPhoto(null);
        setPreview(null);
    };

    // En "no realizado" el tipo lo pone el backend, así que no se exige.
    const ready = description.trim().length > 0 && (notDone || incidentType !== null);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!ready || saving) return;

        onSubmit({ incidentType, description: description.trim(), taskId, photo });
    };

    return (
        <dialog
            className="cf-inc-sheet"
            ref={dialog}
            aria-label={notDone ? "No se ha podido hacer el servicio" : "Abrir incidencia"}
            onClose={onClose}
        >
            <form className="cf-inc-sheet__form" onSubmit={handleSubmit}>

                <div className="cf-inc-sheet__head">
                    <div>
                        <h2 className="cf-inc-sheet__title">
                            {notDone ? "¿No se ha podido hacer?" : "¿Qué ha pasado?"}
                        </h2>
                        <p className="cf-inc-sheet__sub">
                            {notDone
                                ? "El servicio se cerrará como no realizado."
                                : "Quedará registrado y lo verá el encargado."}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="cf-inc-sheet__close"
                        aria-label="Cerrar"
                        onClick={onClose}
                    >
                        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </div>

                <div className="cf-inc-sheet__body">

                    {/* Lo que no se deshace se avisa antes, no después. */}
                    {notDone && (
                        <p className="cf-inc-warn">
                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                            <span>
                                Esto no se puede deshacer. El cliente lo verá, y el encargado
                                decidirá si se reprograma.
                            </span>
                        </p>
                    )}

                    {!notDone && (
                        <div className="cf-inc-field">
                            <span className="cf-inc-field__label">¿De dónde viene?</span>

                            <div className="cf-inc-types">
                                {TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        className="cf-inc-type"
                                        aria-pressed={incidentType === type.value}
                                        onClick={() => setIncidentType(type.value)}
                                    >
                                        <span className="cf-inc-type__name">
                                            <i className={`fa-solid ${type.icon}`} aria-hidden="true"></i>
                                            {type.label}
                                            <i className="fa-solid fa-check cf-inc-type__check" aria-hidden="true"></i>
                                        </span>
                                        <span className="cf-inc-type__eg">{type.example}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="cf-inc-field">
                        <label className="cf-inc-field__label" htmlFor="incident-description">
                            {notDone ? "¿Qué ha pasado?" : "Cuéntalo"}
                        </label>

                        <textarea
                            id="incident-description"
                            className="cf-dash-input"
                            rows={4}
                            maxLength={MAX_LENGTH}
                            placeholder="Llamé dos veces y esperé 20 minutos. No abrió nadie."
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        ></textarea>

                        {/* El contador solo cuando queda poco: antes es ruido. */}
                        {description.length > MAX_LENGTH - 100 && (
                            <p className="cf-inc-field__count">
                                {description.length} / {MAX_LENGTH}
                            </p>
                        )}
                    </div>

                    {/* La tarea, solo si el servicio tiene. */}
                    {!notDone && tasks.length > 0 && (
                        <div className="cf-inc-field">
                            <label className="cf-inc-field__label" htmlFor="incident-task">
                                ¿En qué tarea? <span className="cf-inc-field__hint">— opcional</span>
                            </label>

                            <select
                                id="incident-task"
                                className="cf-dash-input"
                                value={taskId}
                                onChange={(event) => setTaskId(event.target.value)}
                            >
                                <option value="">En ninguna en concreto</option>
                                {tasks.map((task) => (
                                    <option key={task.booking_task_id} value={task.booking_task_id}>
                                        {task.task_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="cf-inc-field">
                        <span className="cf-inc-field__label">
                            Foto <span className="cf-inc-field__hint">— opcional</span>
                        </span>

                        {preview ? (
                            <div className="cf-inc-shot cf-inc-shot--full">
                                <img className="cf-inc-shot__img" src={preview} alt="La foto elegida" />
                                <button
                                    type="button"
                                    className="cf-inc-shot__del"
                                    aria-label="Quitar la foto"
                                    onClick={dropPhoto}
                                >
                                    <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="cf-inc-shot"
                                    onClick={() => input.current?.click()}
                                >
                                    <i className="fa-solid fa-camera fa-lg" aria-hidden="true"></i>
                                    Hacer foto
                                </button>

                                {/* capture: en el móvil abre la cámara. */}
                                <input
                                    ref={input}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    hidden
                                    onChange={handlePick}
                                />
                            </>
                        )}
                    </div>

                    {/* El motivo, escrito antes de que se intente enviar. */}
                    {!ready && (
                        <p className="cf-inc-hint">
                            <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                            {notDone || incidentType
                                ? "Hace falta que cuentes qué ha pasado"
                                : "Elige de dónde viene y cuéntalo"}
                        </p>
                    )}
                </div>

                <div className="cf-inc-sheet__foot">
                    <button
                        type="button"
                        className="cf-dash-btn cf-dash-btn--ghost"
                        disabled={saving}
                        onClick={onClose}
                    >
                        {notDone ? "Volver" : "Cancelar"}
                    </button>

                    <button
                        type="submit"
                        className={`cf-dash-btn${notDone ? " cf-dash-btn--danger" : ""}`}
                        disabled={!ready || saving}
                    >
                        {saving
                            ? "Enviando…"
                            : notDone
                                ? "Marcar no realizado"
                                : "Abrir incidencia"}
                    </button>
                </div>

            </form>
        </dialog>
    );
};
