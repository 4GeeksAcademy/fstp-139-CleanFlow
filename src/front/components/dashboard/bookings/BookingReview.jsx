/**
 * TU VALORACIÓN (#20).
 *
 * El último paso del recorrido del cliente, debajo del bloque de
 * confirmación. Dos caras:
 *
 *   ya valorada   la nota que puso, con su comentario y sus fotos
 *   sin valorar   el formulario, solo si dio el servicio por bueno
 *
 * No se ve mientras el servicio esté en plazo o en revisión: pedir nota
 * con algo sin resolver es pedirla enfadado.
 *
 * Solo pinta y avisa; quien llama a la API es la página.
 *
 * Estilos: dashboard.css, sección 13 (cf-rate).
 */

import { useEffect, useRef, useState } from "react";
import { Stars } from "./Stars";
import { longDate } from "./bookingFormat";

// Los mismos que acepta el backend.
const MAX_PHOTOS = 3;
const MAX_LENGTH = 500;

export const BookingReview = ({ booking, saving, error, onSubmit }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [photos, setPhotos] = useState([]);

    // El input de archivo, que se dispara desde la franja de añadir.
    const input = useRef(null);

    // Al salir de la pantalla se sueltan las vistas previas: cada
    // createObjectURL reserva memoria hasta que se revoca.
    useEffect(() => () => {
        photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    }, [photos]);

    const review = booking.review;
    const state = booking.confirmation;

    // ---------- LO QUE YA DEJÓ ----------

    if (review) {
        return (
            <section className="cf-bookblock">
                <p className="cf-bookblock__title">Tu valoración</p>

                <div className="cf-rate__done">
                    <Stars value={review.rating} />
                    {review.created_at && (
                        <span className="cf-rate__when">
                            El {longDate(review.created_at).toLowerCase()}
                        </span>
                    )}
                </div>

                {review.comment && <p className="cf-rate__mine">{review.comment}</p>}

                {review.media?.length > 0 && (
                    <div className="cf-rate__gallery">
                        {review.media.map((photo) => (
                            <img
                                key={photo.media_id}
                                className="cf-rate__pic"
                                src={photo.media_url}
                                alt="Foto que subiste con tu valoración"
                                loading="lazy"
                            />
                        ))}
                    </div>
                )}

                <p className="cf-rate__locked">
                    Una valoración no se puede cambiar ni borrar.
                </p>
            </section>
        );
    }

    // Solo se valora un servicio dado por bueno. En plazo o en revisión
    // todavía no toca, y el bloque no aparece.
    if (state !== "confirmed" && state !== "auto_confirmed") return null;

    // ---------- EL FORMULARIO ----------

    const handlePick = (event) => {
        const chosen = [...event.target.files];

        if (chosen.length === 0) return;

        // Las que pasen del tope se ignoran, igual que hace el backend:
        // así el aviso no llega después de haberlas subido.
        setPhotos((current) => [
            ...current,
            ...chosen
                .slice(0, MAX_PHOTOS - current.length)
                .map((file) => ({ file, url: URL.createObjectURL(file) })),
        ]);

        event.target.value = "";
    };

    const dropPhoto = (url) => {
        URL.revokeObjectURL(url);
        setPhotos((current) => current.filter((photo) => photo.url !== url));
    };

    const full = photos.length >= MAX_PHOTOS;

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!rating || saving) return;

        onSubmit({
            rating,
            comment: comment.trim(),
            photos: photos.map((photo) => photo.file),
        });
    };

    return (
        <section className="cf-bookblock">
            <p className="cf-bookblock__title">Tu valoración</p>

            <form onSubmit={handleSubmit}>
                <p className="cf-rate__ask">¿Qué tal fue?</p>
                <p className="cf-rate__hint">
                    Tu nota cuenta para la media de
                    {booking.worker_name ? ` ${booking.worker_name}` : " quien vino"} y
                    para la de CleanFlow.
                </p>

                <Stars
                    value={rating}
                    onChange={setRating}
                    label="Nota del servicio"
                    count
                />

                <div className="cf-rate__field">
                    <label className="cf-rate__label" htmlFor="review-comment">
                        Cuéntalo si quieres
                    </label>
                    <textarea
                        id="review-comment"
                        className="cf-dash-input"
                        rows={3}
                        maxLength={MAX_LENGTH}
                        placeholder="Dejaron la casa impecable y fueron muy puntuales."
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                    ></textarea>
                </div>

                {photos.length > 0 && (
                    <div className="cf-rate__shots">
                        {photos.map((photo) => (
                            <span key={photo.url} className="cf-rate__shot">
                                <img className="cf-rate__img" src={photo.url} alt="Foto que has elegido" />
                                <button
                                    type="button"
                                    className="cf-rate__drop"
                                    aria-label="Quitar la foto"
                                    onClick={() => dropPhoto(photo.url)}
                                >
                                    <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Una franja ancha y no un cuadradito: es opcional, así que
                    tiene que verse sin buscarlo. Al llegar al tope desaparece,
                    en vez de dejar un botón que solo sirve para dar error. */}
                {!full ? (
                    <button
                        type="button"
                        className="cf-rate__pick"
                        onClick={() => input.current?.click()}
                    >
                        <i className="fa-solid fa-camera fa-lg" aria-hidden="true"></i>
                        <span className="cf-rate__pick-main">
                            {photos.length ? "Añadir otra foto" : "Añadir fotos"}
                        </span>
                        <span className="cf-rate__pick-sub">
                            {photos.length
                                ? `${photos.length} de ${MAX_PHOTOS}`
                                : `Opcional · hasta ${MAX_PHOTOS}`}
                        </span>
                    </button>
                ) : (
                    <p className="cf-rate__count">
                        {MAX_PHOTOS} de {MAX_PHOTOS} · no caben más
                    </p>
                )}

                {/* multiple: se pueden elegir varias de una vez. El input va
                    escondido porque el del navegador no se puede maquetar. */}
                <input
                    ref={input}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={handlePick}
                />

                {error && <p className="cf-dash-alert" role="alert">{error}</p>}

                <div className="cf-rate__foot">
                    {/* El aviso va antes de enviar: después no sirve de nada. */}
                    <p className="cf-rate__note">
                        Hasta {MAX_PHOTOS} fotos. No se podrá cambiar después.
                    </p>

                    <button type="submit" className="cf-dash-btn" disabled={!rating || saving}>
                        {saving ? "Enviando…" : "Enviar valoración"}
                    </button>
                </div>
            </form>
        </section>
    );
};
