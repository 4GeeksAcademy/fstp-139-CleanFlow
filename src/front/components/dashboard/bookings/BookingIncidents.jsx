/**
 * INCIDENCIAS DE LA RESERVA.
 *
 * Lo que salió mal, con su descripción, sus fotos y, si el encargado ya
 * la cerró, la nota de resolución que escribió.
 *
 * Solo lectura: abrirlas es la #18 y resolverlas la #19. Sin incidencias
 * el bloque no aparece.
 *
 * Estilos: dashboard.css (cf-bookincidents).
 */

import { shortMoment } from "./bookingFormat";

// De dónde venía el problema. Se dice en claro, sin tecnicismos.
const TYPES = {
    client: "Del cliente",
    company: "De CleanFlow",
};

export const BookingIncidents = ({ incidents, onZoom }) => {
    if (!incidents?.length) return null;

    return (
        <section className="cf-bookblock">
            <h2 className="cf-bookblock__title">Incidencias</h2>

            <div className="cf-bookincidents">
                {incidents.map((incident) => (
                    <article key={incident.incident_id} className="cf-bookincident">

                        <div className="cf-bookincident__top">
                            <span className="cf-bookstate cf-bookstate--action">
                                {TYPES[incident.incident_type] || "Incidencia"}
                            </span>

                            {/* Sin resolver: lo que todavía está en el aire. */}
                            {!incident.resolved && (
                                <span className="cf-bookstate cf-bookstate--fail">
                                    <span className="cf-bookstate__dot"></span>
                                    Sin resolver
                                </span>
                            )}

                            {incident.created_at && (
                                <span className="cf-bookincident__when">
                                    {shortMoment(incident.created_at)}
                                </span>
                            )}
                        </div>

                        <p className="cf-bookincident__text">{incident.description}</p>

                        {incident.media?.length > 0 && (
                            <div className="cf-bookincident__shots">
                                {incident.media.map((photo) => (
                                    <button
                                        key={photo.media_id}
                                        type="button"
                                        className="cf-bookshot"
                                        onClick={() => onZoom({
                                            url: photo.media_url,
                                            label: "Foto de la incidencia",
                                        })}
                                    >
                                        <img
                                            className="cf-bookshot__img"
                                            src={photo.media_url}
                                            alt="Foto de la incidencia"
                                            loading="lazy"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {incident.resolved && incident.resolution && (
                            <p className="cf-bookincident__fix">
                                <strong>Resuelta por CleanFlow</strong>
                                {incident.resolution}
                            </p>
                        )}

                    </article>
                ))}
            </div>
        </section>
    );
};
