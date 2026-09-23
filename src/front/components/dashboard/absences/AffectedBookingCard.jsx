/**
 * UNA RESERVA AFECTADA (#75).
 *
 * Qué pasa (motivos), con quién (trabajador), cuándo (días) y cómo
 * resolverla. Tres momentos en la misma tarjeta:
 *
 *   1. Sin mirar:       botón "Buscar sustituto".
 *   2. Hay libres:      desplegable con quien puede todos los días + Reasignar.
 *   3. Nadie libre:     aviso + motivo para el cliente + Cancelar como CleanFlow
 *                       (pide confirmación: el cliente lo verá).
 *
 * No llama a la API: la página le pasa onFind, onReassign y onCancel, que
 * devuelven { ok, message } (onFind, además, workers).
 *
 * Estilos: dashboard.css (cf-affected__*).
 */

import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Avatar } from "../Avatar"

// El motivo que se propone al cancelar. Se puede cambiar antes de enviar.
const DEFAULT_CANCEL_REASON =
    "Lo sentimos, ese día no tenemos personal disponible. Puedes volver a reservar en otra fecha."

// El mismo tope que acepta la API.
const MAX_REASON = 1000

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
    // null = aún no se ha buscado · [] = nadie libre · [...] = candidatos
    const [workers, setWorkers] = useState(null)
    const [selected, setSelected] = useState("")
    const [reason, setReason] = useState(DEFAULT_CANCEL_REASON)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")

    // Confirmación de cancelar
    const [confirming, setConfirming] = useState(false)
    const dialogRef = useRef(null)

    const id = booking.booking_id

    useEffect(() => {
        if (confirming) dialogRef.current?.showModal()
    }, [confirming])

    // ------------------------------------------------------------------
    // ACCIONES (la API la llama la página)
    // ------------------------------------------------------------------

    const find = async () => {
        setBusy(true)
        setError("")

        const result = await onFind(booking)

        setBusy(false)

        if (result.ok) {
            setWorkers(result.workers)
            setSelected(result.workers[0] ? String(result.workers[0].worker_id) : "")
        } else {
            setError(result.message)
        }
    }

    const reassign = async (event) => {
        event.preventDefault()

        setBusy(true)
        setError("")

        const result = await onReassign(booking, Number(selected))

        // Si sale bien, la página quita la tarjeta de la lista.
        if (!result.ok) {
            setBusy(false)
            setError(result.message)
            // Los libres pueden haber cambiado: se vuelve a buscar.
            setWorkers(null)
        }
    }

    const askCancel = (event) => {
        event.preventDefault()

        if (!reason.trim()) {
            setError("Escribe el motivo que verá el cliente.")
            return
        }

        setError("")
        setConfirming(true)
    }

    const closeDialog = () => dialogRef.current?.close()

    const confirmCancel = async () => {
        closeDialog()
        setBusy(true)

        const result = await onCancel(booking, reason.trim())

        if (!result.ok) {
            setBusy(false)
            setError(result.message)
            setWorkers(null)
        }
    }

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

            <div className="cf-affected__resolve">
                {error && (
                    <p className="cf-dash-alert" role="alert">
                        {error}
                    </p>
                )}

                {workers === null && (
                    <div className="cf-affected__resolve-row">
                        <button type="button" className="cf-dash-btn" onClick={find} disabled={busy}>
                            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                            {busy ? "Buscando..." : "Buscar sustituto"}
                        </button>
                    </div>
                )}

                {workers?.length > 0 && (
                    <form className="cf-affected__resolve-row" onSubmit={reassign}>
                        <div className="cf-dash-field">
                            <label className="cf-dash-field__label" htmlFor={`replacement-${id}`}>
                                Libres todos los días de la reserva
                            </label>
                            <select
                                id={`replacement-${id}`}
                                className="cf-dash-input"
                                value={selected}
                                onChange={(event) => setSelected(event.target.value)}
                                disabled={busy}
                            >
                                {workers.map((worker) => (
                                    <option key={worker.worker_id} value={worker.worker_id}>
                                        {worker.name} {worker.last_name} · {worker.shift_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="cf-dash-btn" disabled={busy}>
                            {busy ? "Reasignando..." : "Reasignar"}
                        </button>
                    </form>
                )}

                {workers?.length === 0 && (
                    <form className="cf-affected__resolve" onSubmit={askCancel}>
                        <p className="cf-affected__none">
                            <i className="fa-solid fa-circle-info" aria-hidden="true" /> Nadie está libre todos los
                            días de esta reserva. Puedes cancelarla como empresa.
                        </p>
                        <div className="cf-dash-field">
                            <label className="cf-dash-field__label" htmlFor={`cancel-${id}`}>
                                Motivo que verá el cliente
                            </label>
                            <textarea
                                id={`cancel-${id}`}
                                className="cf-dash-input"
                                rows={2}
                                maxLength={MAX_REASON}
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                disabled={busy}
                            />
                        </div>
                        <div className="cf-affected__resolve-row">
                            <button type="submit" className="cf-dash-btn cf-dash-btn--danger" disabled={busy}>
                                {busy ? "Cancelando..." : "Cancelar como CleanFlow"}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {confirming && (
                <dialog
                    ref={dialogRef}
                    className="cf-dash-modal"
                    aria-labelledby={`cancel-title-${id}`}
                    aria-describedby={`cancel-text-${id}`}
                    onClose={() => setConfirming(false)}
                    onClick={(event) => event.target === event.currentTarget && closeDialog()}
                >
                    <div className="cf-dash-modal__body">
                        <span className="cf-dash-modal__icon">
                            <i className="fa-solid fa-ban" aria-hidden="true" />
                        </span>
                        <h2 className="cf-dash-modal__title" id={`cancel-title-${id}`}>
                            ¿Cancelar la reserva #{id}?
                        </h2>
                        <p className="cf-dash-modal__text" id={`cancel-text-${id}`}>
                            {booking.client_name} verá la reserva cancelada por CleanFlow en Mis reservas, con el
                            motivo que has escrito. No se puede deshacer.
                        </p>
                        <div className="cf-dash-modal__actions">
                            {/* autoFocus en Volver: con Enter no se cancela por error. */}
                            <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={closeDialog} autoFocus>
                                Volver
                            </button>
                            <button type="button" className="cf-dash-btn cf-dash-btn--danger" onClick={confirmCancel}>
                                Cancelar reserva
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </li>
    )
}
