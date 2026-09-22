/**
 * AUSENCIAS DE UN TRABAJADOR (ENCARGADO) · #75.
 *
 * Se llega desde el botón "Ausencias" del listado. Arriba, quién es
 * (puesto, turno y valoración); debajo, el formulario (si se abre) y la
 * lista en dos grupos. Quitar pide confirmación.
 *
 * Guardar o quitar avisa al contador del menú (refreshAffected): cambia
 * qué reservas quedan afectadas.
 *
 * Ruta: /dashboard/workers/:workerId/absences · API: services/absenceService.js
 * Componentes: components/dashboard/absences/ · Estilos: dashboard.css (cf-absences__*).
 */

import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getWorkers } from "../../services/workerService"
import { getAbsences, saveAbsence, removeAbsence, refreshAffected } from "../../services/absenceService"
import { AbsenceForm } from "../../components/dashboard/absences/AbsenceForm"
import { AbsenceList } from "../../components/dashboard/absences/AbsenceList"
import { absenceDates, reasonLabel, todayInMadrid } from "../../components/dashboard/absences/AbsenceRow"
import "../../dashboard.css"

// "4.8" -> "4,8"
const formatRating = (rating) =>
    rating.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Filas grises que se ven mientras carga.
const SKELETON_ROWS = 3

// Volver al listado: va arriba en todas las variantes de la página.
const BackLink = () => (
    <Link to="/dashboard/workers" className="cf-absences__back">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        Trabajadores
    </Link>
)

export const WorkerAbsencesPage = () => {
    const { store, dispatch } = useGlobalReducer()
    const { workerId } = useParams()

    // ------------------------------------------------------------------
    // ESTADO
    // ------------------------------------------------------------------

    // El trabajador (para la cabecera) y sus ausencias
    const [worker, setWorker] = useState(null)
    const [absences, setAbsences] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")

    // Formulario. editing: null = cerrado · { absence: null } = nueva · { absence } = editando
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("")

    // Confirmación de quitar: la ausencia, o null.
    const [removing, setRemoving] = useState(null)
    const [removeError, setRemoveError] = useState("")
    const dialogRef = useRef(null)

    // Aviso para lectores de pantalla tras guardar o quitar.
    const [status, setStatus] = useState("")

    // ------------------------------------------------------------------
    // CARGA Y EFECTOS
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

    // Las dos peticiones a la vez. Se usa el listado y no GET /workers/<id>:
    // solo el listado trae el horario del turno y la valoración.
    const loadPage = async () => {
        setLoading(true)
        setLoadError("")

        const [workersResult, absencesResult] = await Promise.all([
            getWorkers(store.token),
            getAbsences(workerId, store.token),
        ])

        if (sessionExpired(absencesResult)) return

        if (!workersResult.ok) {
            setLoadError(workersResult.data.error || workersResult.data.msg || "No se han podido cargar los datos del trabajador.")
        } else if (!absencesResult.ok) {
            setLoadError(absencesResult.data.message)
        } else {
            const found = workersResult.data.workers.find((item) => String(item.worker_id) === workerId)

            if (found) {
                setWorker(found)
                setAbsences(absencesResult.data.absences)
            } else {
                setLoadError("Ese trabajador no existe o ya no forma parte del equipo.")
            }
        }

        setLoading(false)
    }

    useEffect(() => {
        if (store.token) loadPage()
    }, [store.token, workerId])

    // showModal(): bloquea el resto de la página, cierra con Escape y
    // devuelve el foco a la papelera al cerrar.
    useEffect(() => {
        if (removing) dialogRef.current?.showModal()
    }, [removing])

    // ------------------------------------------------------------------
    // FORMULARIO
    // ------------------------------------------------------------------

    const openForm = (absence) => {
        setEditing({ absence })
        setFormError("")
        setStatus("")
    }

    const closeForm = () => setEditing(null)

    const submitForm = async (data) => {
        setSaving(true)
        setFormError("")

        const id = editing.absence?.absence_id ?? null
        const result = await saveAbsence(workerId, id, data, store.token)

        if (sessionExpired(result)) return

        setSaving(false)

        if (!result.ok) {
            setFormError(result.data.message)
            return
        }

        // Se recarga la lista entera: la API puede ajustar la ausencia.
        const reload = await getAbsences(workerId, store.token)
        if (reload.ok) setAbsences(reload.data.absences)

        refreshAffected()
        closeForm()
        setStatus(id ? "Ausencia actualizada." : "Ausencia guardada.")
    }

    // ------------------------------------------------------------------
    // QUITAR
    // ------------------------------------------------------------------

    const askRemove = (absence) => {
        setRemoveError("")
        setStatus("")
        setRemoving(absence)
    }

    // Cancelar, Escape y pulsar fuera pasan por close(): su onClose es el
    // único sitio que limpia `removing`.
    const closeDialog = () => dialogRef.current?.close()

    const confirmRemove = async () => {
        const absence = removing
        closeDialog()

        const result = await removeAbsence(workerId, absence.absence_id, store.token)

        if (sessionExpired(result)) return

        if (!result.ok) {
            setRemoveError(result.data.message)
            return
        }

        // Si se estaba editando justo esa, el formulario ya no tiene sentido.
        if (editing?.absence?.absence_id === absence.absence_id) closeForm()

        setAbsences((current) => current.filter((item) => item.absence_id !== absence.absence_id))
        refreshAffected()
        setStatus("Ausencia quitada.")
    }

    // ------------------------------------------------------------------
    // PANTALLA
    // ------------------------------------------------------------------

    if (loading) {
        return (
            <section className="cf-absences" aria-busy="true">
                {/* Aún no se sabe el nombre: barras en lugar del título y del resumen. */}
                <div className="cf-absences__header">
                    <div className="cf-absences__skel-head">
                        <BackLink />
                        <p className="cf-dash-eyebrow">Equipo</p>
                        <span className="cf-dash-skel cf-absences__skel-title" />
                        <span className="cf-dash-skel cf-absences__skel-who" />
                    </div>
                </div>

                <p className="sr-only">Cargando ausencias...</p>

                <ul className="cf-absences__list" aria-hidden="true">
                    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                        <li className="cf-absences__row" key={index}>
                            <div>
                                <span className="cf-dash-skel cf-absences__skel-dates" />
                                <span className="cf-dash-skel cf-absences__skel-notes" />
                            </div>
                            <span className="cf-dash-skel cf-absences__skel-pill" />
                            <div className="cf-absences__row-actions">
                                <span className="cf-dash-skel cf-absences__skel-btn" />
                            </div>
                        </li>
                    ))}
                </ul>
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
                    <button type="button" className="cf-dash-btn" onClick={loadPage}>
                        Reintentar
                    </button>
                </div>
            </section>
        )
    }

    const today = todayInMadrid()

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

                {/* Con el formulario abierto sobra: ya se está añadiendo. Sin
                    ausencias tampoco: el botón va en el estado vacío. */}
                {!editing && absences.length > 0 && (
                    <button type="button" className="cf-dash-btn" onClick={() => openForm(null)}>
                        <i className="fa-solid fa-plus" aria-hidden="true" />
                        Añadir ausencia
                    </button>
                )}
            </div>

            <p className="sr-only" role="status">
                {status}
            </p>

            {removeError && (
                <p className="cf-dash-alert" role="alert">
                    {removeError}
                </p>
            )}

            {/* key: al pasar de editar una a otra, el formulario empieza de cero. */}
            {editing && (
                <AbsenceForm
                    key={editing.absence?.absence_id ?? "new"}
                    absence={editing.absence}
                    saving={saving}
                    error={formError}
                    onSubmit={submitForm}
                    onClose={closeForm}
                />
            )}

            {absences.length === 0 ? (
                !editing && (
                    <div className="cf-dash-state">
                        <span className="cf-dash-state__icon">
                            <i className="fa-solid fa-calendar-check" aria-hidden="true" />
                        </span>
                        <p className="cf-dash-state__title">{worker.name} no tiene ausencias</p>
                        <p className="cf-dash-state__text">
                            Registra sus vacaciones, bajas u otros días libres: esos días no aparecerá disponible
                            para reservar.
                        </p>
                        <button type="button" className="cf-dash-btn" onClick={() => openForm(null)}>
                            <i className="fa-solid fa-plus" aria-hidden="true" />
                            Añadir la primera ausencia
                        </button>
                    </div>
                )
            ) : (
                <AbsenceList
                    absences={absences}
                    today={today}
                    disabled={saving}
                    onEdit={openForm}
                    onRemove={askRemove}
                />
            )}

            {removing && (
                // onClick en el propio dialog: solo llega aquí el clic en el
                // fondo oscuro, porque el contenido va dentro de __body.
                <dialog
                    ref={dialogRef}
                    className="cf-dash-modal"
                    aria-labelledby="remove-title"
                    aria-describedby="remove-text"
                    onClose={() => setRemoving(null)}
                    onClick={(event) => event.target === event.currentTarget && closeDialog()}
                >
                    <div className="cf-dash-modal__body">
                        <span className="cf-dash-modal__icon">
                            <i className="fa-solid fa-trash-can" aria-hidden="true" />
                        </span>
                        <h2 className="cf-dash-modal__title" id="remove-title">
                            ¿Quitar esta ausencia?
                        </h2>
                        <p className="cf-dash-modal__text" id="remove-text">
                            {reasonLabel(removing.reason)}: {absenceDates(removing).toLowerCase()}. Esos días{" "}
                            {worker.name} volverá a aparecer libre, y sus reservas dejarán de estar afectadas.
                        </p>
                        <div className="cf-dash-modal__actions">
                            {/* autoFocus en Cancelar: con Enter no se quita por error. */}
                            <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={closeDialog} autoFocus>
                                Cancelar
                            </button>
                            <button type="button" className="cf-dash-btn cf-dash-btn--danger" onClick={confirmRemove}>
                                Quitar ausencia
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </section>
    )
}
