/**
 * CERRAR UNA INCIDENCIA.
 *
 * El diálogo donde el encargado escribe qué se ha hecho (#19). La nota
 * es obligatoria: si la incidencia la abrió el cliente, es lo que va a
 * leer en su pantalla, y cerrar sin explicar lo deja peor que antes.
 *
 * Reutiliza el diálogo de las incidencias del trabajador (cf-inc-sheet):
 * es el mismo tipo de formulario.
 *
 * Solo pinta y avisa con onSubmit; quien llama a la API es la página.
 *
 * Estilos: dashboard.css, sección 11 (cf-inc-sheet).
 */

import { useEffect, useRef, useState } from "react";

// Lo mismo que acepta el backend.
const MAX_LENGTH = 500;

export const ResolveForm = ({ incident, saving, onSubmit, onClose }) => {
    const dialog = useRef(null);
    const [resolution, setResolution] = useState("");

    const open = Boolean(incident);

    // Abrir y cerrar lo decide la prop: el dialog solo obedece.
    useEffect(() => {
        if (!dialog.current) return;

        if (open && !dialog.current.open) dialog.current.showModal();
        if (!open && dialog.current.open) dialog.current.close();
    }, [open]);

    // Al cerrarse se vacía: la próxima incidencia no debe heredar la nota
    // que se escribió para otra.
    useEffect(() => {
        if (!open) setResolution("");
    }, [open]);

    const ready = resolution.trim().length > 0;

    // Si la abrió el cliente, la nota sale de la aplicación y la lee él.
    const forClient = incident?.source === "client";

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!ready || saving) return;

        onSubmit(incident, resolution.trim());
    };

    return (
        <dialog
            className="cf-inc-sheet"
            ref={dialog}
            aria-label="Resolver la incidencia"
            onClose={onClose}
        >
            <form className="cf-inc-sheet__form" onSubmit={handleSubmit}>

                <div className="cf-inc-sheet__head">
                    <div>
                        <h2 className="cf-inc-sheet__title">Resolver la incidencia</h2>
                        <p className="cf-inc-sheet__sub">
                            {incident
                                ? `Reserva n.º ${incident.booking_id} · ${incident.booking?.service || "Servicio"}`
                                : ""}
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

                    {/* Solo cuando la abrió el cliente: si es del trabajador,
                        la nota es interna y no hace falta advertir nada. */}
                    {forClient && (
                        <p className="cf-inc-warn">
                            <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                            <span>
                                Esta nota <strong>la va a leer el cliente</strong>, porque la
                                reclamación es suya.
                            </span>
                        </p>
                    )}

                    <div className="cf-inc-field">
                        <label className="cf-inc-field__label" htmlFor="resolution">
                            ¿Qué habéis hecho?
                        </label>

                        <textarea
                            id="resolution"
                            className="cf-dash-input"
                            rows={4}
                            maxLength={MAX_LENGTH}
                            placeholder="Volvemos el jueves sin coste para repasar el baño y el salón."
                            value={resolution}
                            onChange={(event) => setResolution(event.target.value)}
                        ></textarea>

                        {resolution.length > MAX_LENGTH - 100 && (
                            <p className="cf-inc-field__count">
                                {resolution.length} / {MAX_LENGTH}
                            </p>
                        )}
                    </div>

                    {!ready && (
                        <p className="cf-inc-hint">
                            <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                            Hace falta explicar qué se ha hecho
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
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="cf-dash-btn"
                        disabled={!ready || saving}
                    >
                        {saving ? "Guardando…" : "Resolver"}
                    </button>
                </div>

            </form>
        </dialog>
    );
};
