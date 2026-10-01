/**
 * UNA RESERVA AFECTADA (#75).
 *
 * Qué pasa (motivos), con quién (trabajador) y cuándo (días). Resolverla
 * es ResolveAffected.jsx, que es el mismo componente que usa la marca de
 * la tarjeta en Reservas: así las dos pantallas no se separan.
 *
 * No llama a la API: la página le pasa onFind, onReassign y onCancel y
 * se los entrega tal cual.
 *
 * Estilos: dashboard.css (cf-affected__*).
 */

import { Link } from "react-router-dom"
import { Avatar } from "../Avatar"
import { ResolveAffected } from "./ResolveAffected"

// "Ausencia: baja" -> "Baja". "Trabajador desactivado" se queda igual.
const reasonText = (reason) => {
    const text = reason.replace(/^Ausencia:\s*/, "")
    return text.charAt(0).toUpperCase() + text.slice(1)
}

// "2026-10-05T08:00:00" + "…T10:00:00" -> "lun 5 oct · 08:00–10:00".
// Horas de Madrid sin zona: se enseñan tal cual, sin pasar por el huso
// del navegador (por eso la fecha se monta en UTC).
const dayText = (day) => {
    const [year, month, date] = day.starts_at.slice(0, 10).split("-").map(Number)
    const label = new Date(Date.UTC(year, month - 1, date))
        .toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
        .replaceAll(".", "")
        .replace(",", "")

    return `${label} · ${day.starts_at.slice(11, 16)}–${day.ends_at.slice(11, 16)}`
}

// "Ana G." -> { name: "Ana", last_name: "G." }, para las iniciales del avatar.
const workerForAvatar = (workerName) => {
    const [name, ...rest] = (workerName || "").split(" ")
    return { name, last_name: rest.join(" ") }
}

export const AffectedBookingCard = ({ booking, onFind, onReassign, onCancel }) => {
    const id = booking.booking_id

    // ------------------------------------------------------------------
    // PANTALLA
    // ------------------------------------------------------------------

    return (
        <li className="cf-affected__card">
            <div className="cf-affected__top">
                <h2 className="cf-affected__id">
                    Reserva #{id}
                    <span className="cf-affected__client">{booking.client_name}</span>
                </h2>
                <div className="cf-affected__reasons">
                    {booking.affected_reasons.map((item) => (
                        <span className="cf-affected__reason" key={item}>
                            {reasonText(item)}
                        </span>
                    ))}
                </div>
            </div>

            <div className="cf-affected__worker">
                <Avatar user={workerForAvatar(booking.worker_name)} size="sm" />
                <span>{booking.worker_name || "Sin trabajador"}</span>
                {booking.worker_id && (
                    <Link to={`/dashboard/workers/${booking.worker_id}/absences`} className="cf-affected__link">
                        Ver sus ausencias
                    </Link>
                )}
            </div>

            <ul className="cf-affected__days" aria-label="Días de la reserva">
                {booking.days.map((day) => (
                    <li className="cf-affected__day" key={day.booking_day_id}>
                        {dayText(day)}
                    </li>
                ))}
            </ul>

            <ResolveAffected
                booking={booking}
                onFind={onFind}
                onReassign={onReassign}
                onCancel={onCancel}
            />
        </li>
    )
}
