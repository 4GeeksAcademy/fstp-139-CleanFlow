/**
 * LAS INCIDENCIAS DEL SERVICIO, VISTAS POR EL TRABAJADOR.
 *
 * Lo que ya se ha contado, con su tipo, su foto y, si el encargado la
 * cerró, lo que decidió hacer. Sin incidencias el bloque no aparece.
 *
 * Es solo lectura: abrirlas se hace desde el botón del bloque de
 * acciones, y resolverlas es del encargado (#19).
 *
 * Comparte los estilos con la lista del cliente (cf-bookincident): el
 * aspecto es el mismo, solo cambian las palabras. Para el cliente son
 * "De CleanFlow"; para quien estuvo allí, "por algo nuestro".
 *
 * Estilos: dashboard.css, sección 9 (cf-bookincident).
 */

import { shortMoment } from "../bookings/bookingFormat";

const TYPES = {
    client: "Por algo del cliente",
    company: "Por algo nuestro",
};

export const WorkerIncidents = ({ incidents }) => {
    if (!incidents?.length) return null;

    return (
        <section className="cf-wblock">
            <h2 className="cf-wblock__title">
                Incidencias{incidents.length > 1 && ` · ${incidents.length}`}
            </h2>

            <div className="cf-bookincidents">
                {incidents.map((incident) => (
                    <article key={incident.incident_id} className="cf-bookincident">

                        <div className="cf-bookincident__top">
                            <span className="cf-bookstate cf-bookstate--action">
                                {TYPES[incident.incident_type] || "Incidencia"}
                            </span>

                            {incident.resolved ? (
                                <span className="cf-bookstate cf-bookstate--done">
                                    <i className="fa-solid fa-check" aria-hidden="true"></i>
                                    Resuelta
                                </span>
                            ) : (
                                <span className="cf-bookstate cf-bookstate--fail">
                                    <span className="cf-bookstate__dot"></span>
                                    Abierta
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
                                    <span key={photo.media_id} className="cf-bookshot">
                                        <img
                                            className="cf-bookshot__img"
                                            src={photo.media_url}
                                            alt="Foto de la incidencia"
                                            loading="lazy"
                                        />
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Lo que decidió el encargado: al trabajador le
                            interesa sobre todo si tiene que hacer algo. */}
                        {incident.resolved && incident.resolution && (
                            <p className="cf-bookincident__fix">
                                <strong>El encargado ha dicho</strong>
                                {incident.resolution}
                            </p>
                        )}

                    </article>
                ))}
            </div>
        </section>
    );
};
