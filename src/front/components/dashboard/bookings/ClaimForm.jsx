/**
 * "HUBO UN PROBLEMA": EL FORMULARIO DE RECLAMACIÓN.
 *
 * Lo que el cliente rellena cuando el servicio no quedó bien (#83): qué
 * pasó y hasta cinco fotos. De aquí sale una incidencia que resuelve el
 * encargado (#19).
 *
 * Reutiliza el diálogo de las incidencias del trabajador (cf-inc-sheet):
 * es el mismo tipo de formulario y no tiene sentido tener dos aspectos
 * distintos para lo mismo.
 *
 * Solo pinta y avisa con onSubmit; quien llama a la API es la página.
 *
 * Estilos: dashboard.css, secciones 9 (cf-claim) y 11 (cf-inc-sheet).
 */

import { useEffect, useRef, useState } from "react";

// Lo mismo que acepta el backend.
const MAX_LENGTH = 500;
const MAX_PHOTOS = 5;

export const ClaimForm = ({ open, saving, onSubmit, onClose }) => {
    const dialog = useRef(null);
    const input = useRef(null);

    const [description, setDescription] = useState("");

    // Cada foto con su vista previa: { file, url }.
    const [photos, setPhotos] = useState([]);

    // Abrir y cerrar lo decide la prop: el dialog solo obedece.
    useEffect(() => {
        if (!dialog.current) return;

        if (open && !dialog.current.open) dialog.current.showModal();
        if (!open && dialog.current.open) dialog.current.close();
    }, [open]);

    // Al cerrarse se vacía, y se sueltan las vistas previas: cada
    // createObjectURL reserva memoria hasta que se revoca.
    useEffect(() => {
        if (open) return;

        setDescription("");
        setPhotos((current) => {
            current.forEach((photo) => URL.revokeObjectURL(photo.url));
            return [];
        });
    }, [open]);

    const handlePick = (event) => {
        const elegidas = [...event.target.files];

        if (elegidas.length === 0) return;

        // Las que pasen del tope se ignoran: es lo mismo que hace el
        // backend, y así el aviso no llega después de subirlas.
        setPhotos((current) => [
            ...current,
            ...elegidas
                .slice(0, MAX_PHOTOS - current.length)
                .map((file) => ({ file, url: URL.createObjectURL(file) })),
        ]);

        event.target.value = "";
    };

    const dropPhoto = (url) => {
        URL.revokeObjectURL(url);
        setPhotos((current) => current.filter((photo) => photo.url !== url));
    };

    const ready = description.trim().length > 0;
    const full = photos.length >= MAX_PHOTOS;

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!ready || saving) return;

        onSubmit({
            description: description.trim(),
            photos: photos.map((photo) => photo.file),
        });
    };

    return (
        <dialog
            className="cf-inc-sheet"
            ref={dialog}
            aria-label="Contar un problema con el servicio"
            onClose={onClose}
        >
            <form className="cf-inc-sheet__form" onSubmit={handleSubmit}>

                <div className="cf-inc-sheet__head">
                    <div>
                        <h2 className="cf-inc-sheet__title">¿Qué pasó?</h2>
                        <p className="cf-inc-sheet__sub">Lo revisamos y te decimos algo.</p>
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

                    <div className="cf-inc-field">
                        <label className="cf-inc-field__label" htmlFor="claim-description">
                            Cuéntanos
                        </label>

                        <textarea
                            id="claim-description"
                            className="cf-dash-input"
                            rows={4}
                            maxLength={MAX_LENGTH}
                            placeholder="El baño quedó sin limpiar y el suelo del salón seguía con polvo."
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

                    <div className="cf-inc-field">
                        <span className="cf-inc-field__label">
                            Fotos <span className="cf-inc-field__hint">
                                — opcional, hasta {MAX_PHOTOS}
                            </span>
                        </span>

                        <div className="cf-claim__shots">
                            {photos.map((photo) => (
                                <div key={photo.url} className="cf-claim__shot cf-claim__shot--full">
                                    <img className="cf-claim__img" src={photo.url} alt="Foto que has elegido" />

                                    <button
                                        type="button"
                                        className="cf-claim__del"
                                        aria-label="Quitar esta foto"
                                        onClick={() => dropPhoto(photo.url)}
                                    >
                                        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                                    </button>
                                </div>
                            ))}

                            {/* Al llegar al tope el hueco se quita, en vez de
                                dejar un botón que solo sirve para dar error. */}
                            {!full && (
                                <button
                                    type="button"
                                    className="cf-claim__shot"
                                    onClick={() => input.current?.click()}
                                >
                                    <i
                                        className={`fa-solid ${photos.length ? "fa-plus" : "fa-camera"} fa-lg`}
                                        aria-hidden="true"
                                    ></i>
                                    Añadir
                                </button>
                            )}
                        </div>

                        {photos.length > 0 && (
                            <p className="cf-claim__count">
                                {photos.length} de {MAX_PHOTOS}
                                {full && " · no caben más"}
                            </p>
                        )}

                        {/* multiple: se pueden elegir varias de una vez. */}
                        <input
                            ref={input}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={handlePick}
                        />
                    </div>

                    {!ready && (
                        <p className="cf-inc-hint">
                            <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                            Hace falta que nos cuentes qué pasó
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
                        {saving ? "Enviando…" : "Enviar"}
                    </button>
                </div>

            </form>
        </dialog>
    );
};
