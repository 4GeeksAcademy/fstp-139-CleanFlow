/**
 * PANEL DE CONTRATACIÓN (CLIENTE).
 *
 * Una sola página para contratar: servicio, tareas, horas, trabajador, día
 * y hora, dirección y descripción. La reserva nace confirmada, porque el
 * cliente elige a quién quiere.
 *
 * Se llega desde "Contratar" en el catálogo, que trae ?servicio=<slug>. Sin
 * ese parámetro, o con un servicio que ya no existe, se pide elegir uno.
 *
 * Cuentas:  booking/bookingRules.js, las mismas que hace el backend.
 * API:      services/bookingService.js y services/availabilityService.js.
 * Estilos:  dashboard.css (cf-dash-* y cf-booking__*).
 */

import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { getServices } from "../../../services/serviceService"
import { formatPrice } from "../../../components/dashboard/ServiceForm"
import "../../../dashboard.css"

// Nombre del parámetro con el que llega el servicio elegido. Es un CONTRATO
// con ServiceCatalog.jsx: si cambia aquí, cambia allí.
const SERVICE_PARAM = "servicio"

// Bloques grises que se ven mientras carga.
const SKELETON_BLOCKS = 3

// Título y entradilla. También salen mientras carga y con error.
const PageHeader = () => (
    <div className="cf-booking__header">
        <p className="cf-dash-eyebrow">Reservar</p>
        <h1 className="cf-booking__title">Contratar un servicio</h1>
        <p className="cf-booking__lede">
            Elige el servicio, las tareas y cuándo quieres que vayamos. Verás el
            precio antes de confirmar y podrás cancelar hasta 1 hora antes.
        </p>
    </div>
)

// Cabecera de un paso: su número, su título y una nota a la derecha.
const BlockHead = ({ step, title, note }) => (
    <div className="cf-booking__block-head">
        <span className="cf-booking__step">{step}</span>
        <h2 className="cf-booking__block-title">{title}</h2>
        {note && <p className="cf-booking__block-note">{note}</p>}
    </div>
)

// ----------------------------------------------------------------------
// COMPONENTE
// ----------------------------------------------------------------------

export const BookingPanel = () => {
    const [searchParams] = useSearchParams()

    const [services, setServices] = useState([])
    const [slug, setSlug] = useState("")
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")

    const loadCatalog = async () => {
        setLoading(true)
        setLoadError("")

        const result = await getServices()

        if (result.ok) {
            setServices(result.data)

            // El servicio de la URL, solo si sigue estando activo. Si no, se
            // queda sin elegir y el desplegable lo pide.
            const wanted = searchParams.get(SERVICE_PARAM)
            const found = result.data.some((service) => service.slug === wanted)

            setSlug(found ? wanted : "")
        } else {
            setLoadError(result.data.message)
        }

        setLoading(false)
    }

    // Solo al entrar: cambiar el desplegable no recarga el catálogo.
    useEffect(() => {
        loadCatalog()
    }, [])

    if (loading) {
        return (
            <section className="cf-booking" aria-busy="true">
                <PageHeader />

                {/* Los bloques grises no dicen nada a un lector de pantalla:
                    este texto sí, y no se ve. */}
                <p className="sr-only">Cargando el panel de contratación...</p>

                <div className="cf-booking__layout" aria-hidden="true">
                    <div className="cf-booking__steps">
                        {Array.from({ length: SKELETON_BLOCKS }, (_, index) => (
                            <div className="cf-booking__block" key={index}>
                                <span className="cf-dash-skel" style={{ width: "40%" }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="cf-booking">
                <PageHeader />

                <div className="cf-dash-state cf-dash-state--error" role="alert">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">No se ha podido cargar el panel</p>
                    <p className="cf-dash-state__text">{loadError}</p>
                    <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={loadCatalog}>
                        Reintentar
                    </button>
                </div>
            </section>
        )
    }

    // null mientras no hay servicio elegido: los pasos que dependen de él
    // (tareas, horas y precio) no se pintan hasta entonces.
    const service = services.find((item) => item.slug === slug) || null

    return (
        <section className="cf-booking">
            <PageHeader />

            <div className="cf-booking__layout">
                <div className="cf-booking__steps">

                    {/* ---- 1 · SERVICIO ---- */}
                    <section className="cf-booking__block">
                        <BlockHead step="1" title="Servicio" />

                        <div className="cf-dash-field">
                            <label className="cf-dash-field__label" htmlFor="booking-service">
                                ¿Qué necesitas?
                            </label>
                            <select
                                id="booking-service"
                                className="cf-dash-input"
                                value={slug}
                                onChange={(event) => setSlug(event.target.value)}
                            >
                                <option value="">Elige un servicio</option>
                                {services.map((item) => (
                                    <option key={item.slug} value={item.slug}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {service && (
                            <ul className="cf-booking__facts">
                                <li>
                                    <i className="fa-solid fa-euro-sign" aria-hidden="true" />
                                    {` ${formatPrice(service.base_hourly_rate)}/hora`}
                                </li>
                                {service.minutes_per_task !== null && (
                                    <li>
                                        <i className="fa-solid fa-clock" aria-hidden="true" />
                                        {` ${service.minutes_per_task} min por tarea`}
                                    </li>
                                )}
                                <li>
                                    <i className="fa-solid fa-hourglass-start" aria-hidden="true" />
                                    {` Desde ${service.min_hours} h`}
                                </li>
                            </ul>
                        )}
                    </section>
                </div>

                {/* ---- RESUMEN ----
                    Se irá llenando con cada paso; de momento solo el servicio. */}
                <aside className="cf-booking__summary">
                    <h2 className="cf-booking__summary-title">Tu reserva</h2>

                    <div className="cf-booking__rows">
                        <dl className="cf-booking__row">
                            <dt>Servicio</dt>
                            <dd>{service ? service.name : "Sin elegir"}</dd>
                        </dl>
                    </div>

                    <button type="button" className="cf-dash-btn" disabled>
                        Confirmar reserva
                    </button>
                    <p className="cf-booking__cancel-note">Puedes cancelar hasta 1 hora antes</p>
                </aside>
            </div>
        </section>
    )
}
