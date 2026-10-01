/**
 * RESOLVER UNA RESERVA AFECTADA.
 *
 * Los tres momentos de resolverla, sacados aquí para que no haya dos
 * copias: lo usan la pantalla de Reservas afectadas y la marca de la
 * tarjeta en Reservas.
 *
 *   1. Sin mirar:   botón "Buscar sustituto".
 *   2. Hay libres:  desplegable con quien puede todos los días + Reasignar.
 *   3. Nadie libre: aviso + motivo para el cliente + Cancelar como CleanFlow.
 *
 * Cancelar pide confirmación AQUÍ DENTRO y no en un <dialog> aparte: en
 * Reservas esto ya vive dentro de uno, y un modal dentro de otro es
 * frágil. Además se decide sin cambiar de sitio, con el motivo todavía
 * a la vista.
 *
 * No llama a la API: la página le pasa onFind, onReassign y onCancel,
 * que devuelven { ok, message } (onFind, además, workers).
 *
 * Estilos: dashboard.css (cf-affected__*).
 */

import { useState } from "react"

// El motivo que se propone al cancelar. Se puede cambiar antes de enviar.
const DEFAULT_CANCEL_REASON =
    "Lo sentimos, ese día no tenemos personal disponible. Puedes volver a reservar en otra fecha."

// El mismo tope que acepta la API.
const MAX_REASON = 1000

export const ResolveAffected = ({ booking, onFind, onReassign, onCancel }) => {
    // null = aún no se ha buscado · [] = nadie libre · [...] = candidatos
    const [workers, setWorkers] = useState(null)
    const [selected, setSelected] = useState("")
    const [reason, setReason] = useState(DEFAULT_CANCEL_REASON)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const [confirming, setConfirming] = useState(false)

    const id = booking.booking_id

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

        // Si sale bien, la página quita la reserva de la lista.
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

    const confirmCancel = async () => {
        setConfirming(false)
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

            {workers?.length === 0 && !confirming && (
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

            {/* La confirmación sustituye al formulario en vez de taparlo:
                así no quedan dos botones de cancelar a la vista. */}
            {confirming && (
                <div className="cf-affected__confirm" role="alertdialog" aria-labelledby={`sure-${id}`}>
                    <p className="cf-affected__confirm-title" id={`sure-${id}`}>
                        ¿Cancelar la reserva #{id}?
                    </p>
                    <p className="cf-affected__confirm-text">
                        {booking.client_name} la verá cancelada por CleanFlow en Mis reservas, con el motivo
                        que has escrito. No se puede deshacer.
                    </p>
                    <div className="cf-affected__resolve-row">
                        {/* autoFocus en Volver: con Enter no se cancela por error. */}
                        <button
                            type="button"
                            className="cf-dash-btn cf-dash-btn--ghost"
                            onClick={() => setConfirming(false)}
                            autoFocus
                        >
                            Volver
                        </button>
                        <button type="button" className="cf-dash-btn cf-dash-btn--danger" onClick={confirmCancel}>
                            Cancelar reserva
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
