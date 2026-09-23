/**
 * RESERVAS AFECTADAS (ENCARGADO) · #75.
 *
 * Reservas pendientes cuyo trabajador tiene una ausencia esos días o está
 * desactivado. Cada tarjeta (AffectedBookingCard.jsx) se resuelve sola:
 * reasignar a alguien libre todos los días o cancelar como empresa.
 *
 * Al resolver una, se avisa al contador del menú (refreshAffected) y se
 * recarga la lista: la reserva resuelta desaparece.
 *
 * API: services/absenceService.js · Estilos: dashboard.css (cf-affected__*).
 */

import { useEffect, useState } from "react"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getAffected, getReplacements, reassignBooking, cancelCompany, refreshAffected } from "../../services/absenceService"
import { AffectedBookingCard } from "../../components/dashboard/absences/AffectedBookingCard"
import "../../dashboard.css"

// Título y frase. Con onRefresh, además, el botón de actualizar.
const PageHeader = ({ onRefresh }) => (
    <div className="cf-affected__header">
        <div>
            <p className="cf-dash-eyebrow">Equipo</p>
            <h1 className="cf-affected__title">Reservas afectadas</h1>
            <p className="cf-affected__lede">
                Reservas cuyo trabajador tiene una ausencia o está desactivado. Reasígnalas o cancélalas como
                empresa: el cliente lo verá en Mis reservas.
            </p>
        </div>

        {onRefresh && (
            <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={onRefresh}>
                <i className="fa-solid fa-rotate" aria-hidden="true" />
                Actualizar
            </button>
        )}
    </div>
)

// Tarjetas grises que se ven mientras carga.
const SKELETON_CARDS = 2

// "1 reserva necesita atención" · "3 reservas necesitan atención"
const countText = (count) =>
    count === 1 ? "1 reserva necesita atención" : `${count} reservas necesitan atención`

export const AffectedBookings = () => {
    const { store, dispatch } = useGlobalReducer()

    // ------------------------------------------------------------------
    // ESTADO
    // ------------------------------------------------------------------

    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")

    // Lo que pasó con la última reserva resuelta ("Reserva reasignada.")
    const [message, setMessage] = useState("")

    // ------------------------------------------------------------------
    // CARGA Y ACCIONES
    // ------------------------------------------------------------------

    // 401 = token caducado: se cierra la sesión y ProtectedRoutes manda al
    // login. Devuelve true para que quien llama no siga.
    const sessionExpired = (result) => {
        if (result.status === 401) {
            dispatch({ type: "LOGOUT" })
            return true
        }
        return false
    }

    // Sin setLoading(true): "Cargando..." solo sale la primera vez. Al
    // actualizar, las tarjetas se quedan hasta que llega la lista nueva.
    const loadBookings = async () => {
        setLoadError("")

        const result = await getAffected(store.token)

        if (sessionExpired(result)) return

        if (result.ok) {
            setBookings(result.data.bookings)
        } else {
            setLoadError(result.data.message)
        }

        setLoading(false)
    }

    useEffect(() => {
        if (store.token) loadBookings()
    }, [store.token])

    // Quién puede cubrir TODOS los días de la reserva. La tarjeta espera
    // { ok, workers } o { ok: false, message }.
    const handleFind = async (booking) => {
        const result = await getReplacements(booking.booking_id, store.token)

        if (sessionExpired(result)) return { ok: false, message: "" }

        return result.ok
            ? { ok: true, workers: result.data.workers }
            : { ok: false, message: result.data.message }
    }

    // Lo común a reasignar y cancelar: si sale bien, se enseña el mensaje,
    // se avisa al contador del menú y se recarga (la reserva desaparece).
    const afterResolve = async (result) => {
        if (sessionExpired(result)) return { ok: false, message: "" }
        if (!result.ok) return { ok: false, message: result.data.message }

        setMessage(result.data.message)
        refreshAffected()
        await loadBookings()

        return { ok: true }
    }

    const handleReassign = async (booking, workerId) =>
        afterResolve(await reassignBooking(booking.booking_id, workerId, store.token))

    const handleCancel = async (booking, reason) =>
        afterResolve(await cancelCompany(booking.booking_id, reason, store.token))

    // ------------------------------------------------------------------
    // PANTALLA
    // ------------------------------------------------------------------

    if (loading) {
        return (
            <section className="cf-affected" aria-busy="true">
                <PageHeader />

                <p className="sr-only">Cargando reservas...</p>
                <span className="cf-dash-skel cf-affected__skel-count" aria-hidden="true" />

                <ul className="cf-affected__list" aria-hidden="true">
                    {Array.from({ length: SKELETON_CARDS }, (_, index) => (
                        <li className="cf-affected__card" key={index}>
                            <div className="cf-affected__top">
                                <div className="cf-affected__skel-head">
                                    <span className="cf-dash-skel cf-affected__skel-id" />
                                    <span className="cf-dash-skel cf-affected__skel-client" />
                                </div>
                                <span className="cf-dash-skel cf-affected__skel-pill" />
                            </div>
                            <div className="cf-affected__worker">
                                <span className="cf-dash-skel cf-skel-avatar cf-skel-avatar--sm" />
                                <span className="cf-dash-skel cf-affected__skel-line" />
                            </div>
                            <ul className="cf-affected__days">
                                <li><span className="cf-dash-skel cf-affected__skel-day" /></li>
                                <li><span className="cf-dash-skel cf-affected__skel-day" /></li>
                            </ul>
                            <div className="cf-affected__resolve">
                                <span className="cf-dash-skel cf-affected__skel-btn" />
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="cf-affected">
                <PageHeader />

                <div className="cf-dash-state cf-dash-state--error" role="alert">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">No se han podido cargar las reservas afectadas</p>
                    <p className="cf-dash-state__text">{loadError}</p>
                    <button type="button" className="cf-dash-btn" onClick={loadBookings}>
                        Reintentar
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className="cf-affected">
            <PageHeader onRefresh={loadBookings} />

            {/* role="status": el lector de pantalla anuncia el resultado al resolver una. */}
            <p className="cf-affected__count" role="status">
                {message && `${message} `}
                {bookings.length > 0 && countText(bookings.length)}
            </p>

            {bookings.length === 0 ? (
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-circle-check" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">No hay reservas afectadas</p>
                    <p className="cf-dash-state__text">
                        Cuando un trabajador tenga una ausencia o se desactive, sus reservas aparecerán aquí.
                    </p>
                </div>
            ) : (
                <ul className="cf-affected__list">
                    {bookings.map((booking) => (
                        <AffectedBookingCard
                            key={booking.booking_id}
                            booking={booking}
                            onFind={handleFind}
                            onReassign={handleReassign}
                            onCancel={handleCancel}
                        />
                    ))}
                </ul>
            )}
        </section>
    )
}
