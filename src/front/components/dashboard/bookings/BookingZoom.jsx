/**
 * FOTO AMPLIADA.
 *
 * El <dialog> que se abre al pulsar una miniatura. Se usa un dialog de
 * verdad y no un div: el navegador ya oscurece el fondo, atrapa el foco
 * dentro y cierra con Escape.
 *
 * photo: { url, label } o null si no hay ninguna abierta.
 *
 * Estilos: dashboard.css (cf-bookzoom).
 */

import { useEffect, useRef } from "react";

export const BookingZoom = ({ photo, onClose }) => {
    const dialog = useRef(null);

    useEffect(() => {
        if (!dialog.current) return;

        // Abrir y cerrar lo decide la prop: el dialog solo obedece.
        if (photo && !dialog.current.open) dialog.current.showModal();
        if (!photo && dialog.current.open) dialog.current.close();
    }, [photo]);

    return (
        <dialog
            className="cf-bookzoom"
            ref={dialog}
            aria-label="Foto ampliada"
            onClose={onClose}
        >
            {photo && (
                <>
                    <img className="cf-bookzoom__img" src={photo.url} alt={photo.label} />

                    <div className="cf-bookzoom__bar">
                        <p className="cf-bookzoom__text">{photo.label}</p>
                        <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={onClose}>
                            Cerrar
                        </button>
                    </div>
                </>
            )}
        </dialog>
    );
};
