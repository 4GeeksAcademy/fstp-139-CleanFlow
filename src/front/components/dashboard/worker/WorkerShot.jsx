/**
 * UN HUECO DE FOTO: EL ANTES O EL DESPUÉS.
 *
 * Vacío, el hueco ES el botón de la cámara: no hay un "subir foto"
 * aparte. En el móvil, capture="environment" abre directamente la cámara
 * trasera en vez del carrete.
 *
 * Mientras sube se enseña ya la miniatura del archivo elegido, con su
 * barra: con datos móviles la subida tarda, y un hueco en blanco durante
 * cinco segundos hace pensar que no ha funcionado.
 *
 * Solo pinta y avisa: quien sube y borra es la página.
 *
 * Estilos: dashboard.css, sección 10 (cf-wshot).
 */

import { useEffect, useRef, useState } from "react";

const LABELS = { before: "Antes", after: "Después" };

export const WorkerShot = ({ kind, photo, uploading, canEdit, onPick, onDelete }) => {
    const input = useRef(null);

    // Vista previa local del archivo recién elegido, para poder enseñar
    // algo antes de que Cloudinary devuelva su URL.
    const [preview, setPreview] = useState(null);

    // createObjectURL reserva memoria del navegador hasta que se suelta:
    // sin este revoke, cada foto dejaría su rastro en la pestaña.
    useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview);
    }, [preview]);

    // Cuando la foto ya está arriba, la vista previa sobra.
    useEffect(() => {
        if (photo) setPreview(null);
    }, [photo]);

    const handleChange = (event) => {
        const [file] = event.target.files;

        if (!file) return;

        setPreview(URL.createObjectURL(file));
        onPick(kind, file);

        // Se limpia el input: si no, elegir el mismo archivo otra vez no
        // dispararía el evento y no se podría reintentar.
        event.target.value = "";
    };

    const image = photo?.media_url || preview;

    // ---------- HUECO VACÍO: ES EL BOTÓN ----------

    if (!image) {
        return (
            <>
                <button
                    type="button"
                    className="cf-wshot"
                    disabled={!canEdit}
                    onClick={() => input.current?.click()}
                >
                    <i className="fa-solid fa-camera fa-lg" aria-hidden="true"></i>
                    {LABELS[kind]}
                </button>

                {/* capture: en el móvil abre la cámara; en el ordenador se
                    ignora y se abre el explorador de archivos. */}
                <input
                    ref={input}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={handleChange}
                />
            </>
        );
    }

    // ---------- CON FOTO ----------

    return (
        <div className="cf-wshot cf-wshot--full">
            <img className="cf-wshot__img" src={image} alt={LABELS[kind]} />

            <span className="cf-wshot__tag">
                {uploading ? "Subiendo…" : LABELS[kind]}
            </span>

            {/* La ✕ solo mientras la tarea sigue abierta: una vez cerrada,
                las fotos son su prueba y no se tocan. */}
            {canEdit && !uploading && photo && (
                <button
                    type="button"
                    className="cf-wshot__del"
                    aria-label={`Quitar la foto del ${LABELS[kind].toLowerCase()}`}
                    onClick={() => onDelete(photo)}
                >
                    <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            )}

            {uploading && <span className="cf-wshot__load"></span>}
        </div>
    );
};
