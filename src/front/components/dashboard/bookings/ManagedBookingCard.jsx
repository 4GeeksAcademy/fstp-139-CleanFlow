/**
 * TARJETA DE UNA RESERVA, VISTA POR EL ENCARGADO.
 *
 * La misma forma que la del cliente (cf-bookcard), con lo que a él le
 * falta: de quién es la reserva y qué le pasa.
 *
 * Las dos marcas viven en la línea del título y no en una fila aparte:
 * todas las tarjetas miden lo mismo, tengan avisos o no, y la lista se
 * recorre sin que el ojo tenga que recolocarse en cada salto. Que algo
 * pasa se ve por la banda terracota del borde.
 *
 * Las dos son botones y NO se pintan igual, a propósito:
 *
 *   Afectada     rellena   -> se resuelve aquí mismo, en un diálogo
 *   N incidencias contorno -> lleva a Incidencias, que tiene su pantalla
 *
 * La forma dice lo que hace cada una. Pintadas iguales habría que
 * aprenderse cuál es cuál.
 *
 * Es una tarjeta aparte y no la del cliente con más props: aquella está
 * aprobada y en uso, y tocarla para esto arriesga una pantalla que
 * funciona. Unificarlas queda apuntado como deuda.
 *
 * Solo pinta: avisa con onAffected y onIncidents.
 *
 * Estilos: dashboard.css (cf-bookcard y cf-bookings__mark).
 */

import { BookingStatusPill } from "./BookingStatusPill"
import { EUROS, dayOf, monthOf, timeOf, initialsOf } from "./bookingFormat"

// "Ausencia: baja" -> "baja". El motivo se lee dentro de la frase de la
// marca, así que va en minúscula y sin la etiqueta de delante.
const motivoCorto = (reason) => reason.replace(/^Ausencia:\s*/, "").toLowerCase()

export const ManagedBookingCard = ({ booking, onAffected, onIncidents }) => {
    const [primero] = booking.days
    const masDias = booking.days.length - 1

    const motivos = booking.affected_reasons || []
    const incidencias = booking.open_incidents || 0
    const pendiente = motivos.length > 0 || incidencias > 0

    return (
        <li className={`cf-bookcard${pendiente ? " cf-bookcard--todo" : ""}`}>
            <div className="cf-bookcard__date">
                <span className="cf-bookcard__day">{dayOf(primero.starts_at)}</span>
                <span className="cf-bookcard__month">{monthOf(primero.starts_at)}</span>
            </div>

            <div className="cf-bookcard__main">
                {/* Las marcas van en la línea del título, no en una fila
                    propia: esa fila existe en TODAS las tarjetas, así que
                    aquí no añaden alto y la lista se lee pareja. */}
                <div className="cf-bookings__head">
                    <h2 className="cf-bookcard__service">{booking.service_name}</h2>

                    {pendiente && (
                        <div className="cf-bookings__marks">
                            {motivos.length > 0 && (
                                <button
                                    type="button"
                                    className="cf-bookings__mark cf-bookings__mark--affected"
                                    onClick={() => onAffected(booking)}
                                >
                                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                                    <span className="cf-bookings__mark-text">
                                        Afectada · {motivos.map(motivoCorto).join(", ")}
                                    </span>
                                </button>
                            )}

                            {incidencias > 0 && (
                                <button
                                    type="button"
                                    className="cf-bookings__mark cf-bookings__mark--incident"
                                    onClick={() => onIncidents(booking)}
                                >
                                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                                    <span className="cf-bookings__mark-text">
                                        {incidencias === 1 ? "1 incidencia" : `${incidencias} incidencias`}
                                    </span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <p className="cf-bookcard__meta">
                    <span>
                        <i className="fa-regular fa-clock" aria-hidden="true"></i>
                        {timeOf(primero.starts_at)} – {timeOf(primero.ends_at)}
                    </span>

                    {masDias > 0 && (
                        <span>+{masDias} {masDias === 1 ? "día" : "días"}</span>
                    )}

                    {/* El cliente primero y en negrita: es lo que distingue
                        esta lista de la del cliente, donde sobra decirlo. */}
                    <span>
                        <span className="cf-bookcard__who cf-bookcard__who--client" aria-hidden="true">
                            {initialsOf(booking.client_name)}
                        </span>
                        <strong>{booking.client_name}</strong>
                    </span>

                    <span>
                        <span className="cf-bookcard__worker" aria-hidden="true">
                            {initialsOf(booking.worker_name)}
                        </span>
                        {booking.worker_name || "Sin asignar"}
                    </span>
                </p>

            </div>

            <div className="cf-bookcard__side">
                <BookingStatusPill status={booking.status} />
                <span className="cf-bookcard__price">{EUROS.format(booking.total_price)}</span>
            </div>
        </li>
    )
}
