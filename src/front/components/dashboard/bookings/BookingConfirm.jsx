/**
 * ¿QUEDÓ TODO BIEN?
 *
 * La respuesta del cliente a un servicio terminado (#83). Cuatro
 * situaciones, y solo una se ve cada vez:
 *
 *   pending         los dos botones, con el plazo a la vista
 *   confirmed       lo dio por bueno
 *   auto_confirmed  no dijo nada y pasaron los 3 días
 *   in_review       reclamó y se está mirando
 *
 * El estado lo calcula el backend (Booking.confirmation): aquí no se
 * repite la cuenta de los días.
 *
 * Solo pinta y avisa; quien llama a la API es la página.
 *
 * Estilos: dashboard.css, sección 9 (cf-ask, cf-answered y cf-review).
 */

import { longDate, deadlineOf } from "./bookingFormat";

/** La reclamación abierta, que es la que tiene el cliente delante. */
const openClaim = (booking) =>
    booking.incidents?.find(
        (incident) => incident.source === "client" && !incident.resolved
    ) || null;

export const BookingConfirm = ({ booking, saving, onConfirm, onClaim }) => {
    const state = booking.confirmation;

    // Sin estado el servicio no ha terminado: no hay nada que preguntar.
    if (!state) return null;

    // ---------- REVISANDO LO QUE CONTÓ ----------

    if (state === "in_review") {
        const claim = openClaim(booking);

        return (
            <section className="cf-review">
                <div className="cf-review__top">
                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                    <h2 className="cf-review__title">Lo estamos revisando</h2>
                </div>

                <p className="cf-review__text">
                    {claim?.created_at
                        ? `Nos lo contaste el ${longDate(claim.created_at).toLowerCase()}. Te diremos algo pronto.`
                        : "Te diremos algo pronto."}
                </p>

                {claim?.description && (
                    <p className="cf-review__mine">«{claim.description}»</p>
                )}

                {claim?.media?.length > 0 && (
                    <div className="cf-review__shots">
                        {claim.media.map((photo) => (
                            <span key={photo.media_id} className="cf-bookshot">
                                <img
                                    className="cf-bookshot__img"
                                    src={photo.media_url}
                                    alt="Foto que enviaste"
                                    loading="lazy"
                                />
                            </span>
                        ))}
                    </div>
                )}
            </section>
        );
    }

    // ---------- YA RESPONDIDO ----------

    if (state === "confirmed" || state === "auto_confirmed") {
        const auto = state === "auto_confirmed";

        return (
            <section className={`cf-answered${auto ? " cf-answered--auto" : ""}`}>
                <span className="cf-answered__icon">
                    <i
                        className={`fa-solid ${auto ? "fa-clock" : "fa-check"}`}
                        aria-hidden="true"
                    ></i>
                </span>

                <div>
                    <p className="cf-answered__title">
                        {auto ? "Se dio por bueno automáticamente" : "Lo diste por bueno"}
                    </p>

                    <p className="cf-answered__text">
                        {auto
                            ? `Se cumplió el plazo el ${deadlineOf(booking.completed_at)} sin respuesta.`
                            : booking.client_confirmed_at
                                ? `El ${longDate(booking.client_confirmed_at).toLowerCase()}. Gracias por decírnoslo.`
                                : "Gracias por decírnoslo."}
                    </p>
                </div>
            </section>
        );
    }

    // ---------- PENDIENTE DE RESPUESTA ----------

    return (
        <section className="cf-ask">
            <h2 className="cf-ask__title">
                <i className="fa-regular fa-circle-question" aria-hidden="true"></i>
                ¿Quedó todo bien?
            </h2>

            <p className="cf-ask__text">Mira las fotos de arriba y dinos qué te parece.</p>

            {/* Con fecha concreta y no "quedan 3 días": es lo que empuja a
                responder, y lo que evita el "no lo sabía" de después. */}
            {booking.completed_at && (
                <p className="cf-ask__due">
                    <i className="fa-regular fa-clock" aria-hidden="true"></i>
                    Si no dices nada, lo damos por bueno el {deadlineOf(booking.completed_at)}
                </p>
            )}

            <div className="cf-ask__buttons">
                <button
                    type="button"
                    className="cf-dash-btn"
                    disabled={saving}
                    onClick={onConfirm}
                >
                    <i className="fa-solid fa-check" aria-hidden="true"></i>
                    Sí, se hizo bien
                </button>

                <button
                    type="button"
                    className="cf-dash-btn cf-dash-btn--ghost"
                    disabled={saving}
                    onClick={onClaim}
                >
                    Hubo un problema
                </button>
            </div>
        </section>
    );
};
