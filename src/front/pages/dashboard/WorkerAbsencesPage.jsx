/**
 * AUSENCIAS DE UN TRABAJADOR (ENCARGADO) · #75.
 *
 * Página propia, a la que se llega desde el botón "Ausencias" del listado.
 * Antes vivían al final de Editar trabajador, mezcladas con sus datos.
 *
 * Cabecera: volver, nombre y un resumen (puesto, turno y valoración).
 * Debajo, la lista y el formulario de ausencias (WorkerAbsences.jsx).
 *
 * Ruta: /dashboard/workers/:workerId/absences · Estilos: dashboard.css (cf-absences__*).
 */

import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getWorkers } from "../../services/workerService"
import { WorkerAbsences } from "../../components/dashboard/WorkerAbsences"
import "../../dashboard.css"

// "4.8" -> "4,8"
const formatRating = (rating) =>
    rating.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Volver al listado: va arriba en todas las variantes de la página.
const BackLink = () => (
    <Link to="/dashboard/workers" className="cf-absences__back">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        Trabajadores
    </Link>
)

export const WorkerAbsencesPage = () => {
    const { store } = useGlobalReducer()
    const { workerId } = useParams()

    const [worker, setWorker] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")

    // Se usa el listado y no GET /workers/<id>: solo el listado trae el
    // horario del turno y la valoración que van en la cabecera.
    const loadWorker = async () => {
        setLoading(true)
        setLoadError("")

        const result = await getWorkers(store.token)

        if (result.ok) {
            const found = result.data.workers.find((item) => String(item.worker_id) === workerId)

            if (found) {
                setWorker(found)
            } else {
                setLoadError("Ese trabajador no existe o ya no forma parte del equipo.")
            }
        } else {
            setLoadError(result.data.error || result.data.msg || "No se han podido cargar los datos del trabajador.")
        }

        setLoading(false)
    }

    useEffect(() => {
        if (store.token) loadWorker()
    }, [store.token, workerId])

    if (loading) {
        return (
            <section className="cf-absences" aria-busy="true">
                <BackLink />
                <p className="cf-dash-state__text">Cargando ausencias...</p>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="cf-absences">
                <BackLink />

                <div className="cf-dash-state cf-dash-state--error" role="alert">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">No se han podido cargar las ausencias</p>
                    <p className="cf-dash-state__text">{loadError}</p>
                    <button type="button" className="cf-dash-btn" onClick={loadWorker}>
                        Reintentar
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className="cf-absences">
            <div className="cf-absences__header">
                <div>
                    <BackLink />
                    <p className="cf-dash-eyebrow">Equipo</p>
                    <h1 className="cf-absences__title">
                        Ausencias de {worker.name} {worker.last_name}
                    </h1>

                    {/* Resumen: lo justo para saber de quién se trata sin volver atrás. */}
                    <div className="cf-absences__who">
                        <span>
                            <i className="fa-solid fa-briefcase" aria-hidden="true" />
                            {worker.position || "Sin puesto"}
                        </span>
                        <span>
                            <i className="fa-solid fa-clock" aria-hidden="true" />
                            {worker.shift_name
                                ? `${worker.shift_name} · ${worker.shift_start}–${worker.shift_end}`
                                : "Sin turno"}
                        </span>
                        {worker.rating != null && (
                            <span>
                                <i className="fa-solid fa-star" aria-hidden="true" />
                                {formatRating(worker.rating)} ({worker.reviews_count})
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Provisional: el paso 8 lo cambia por la lista y el formulario
                nuevos (components/dashboard/absences/). */}
            <WorkerAbsences key={workerId} workerId={workerId} token={store.token} />
        </section>
    )
}
