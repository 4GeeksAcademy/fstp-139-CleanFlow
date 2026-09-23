/**
 * TRABAJADORES (ENCARGADO) · #75.
 *
 * Todo el equipo en una lista, con pestañas y buscador, como el catálogo de
 * servicios. Cada fila (WorkerRow.jsx) lleva su interruptor de estado.
 * Desactivar pide confirmación; activar no.
 *
 * Desactivar ≠ ausencia: desactivado, el trabajador no entra en la app ni
 * sale libre para reservas, y sus reservas futuras pasan a afectadas.
 *
 * API: services/workerService.js · Estilos: dashboard.css (cf-workers__*).
 */

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getWorkers, toggleWorkerStatus } from "../../services/workerService"
import { SearchBox, matchesSearch } from "../../components/dashboard/SearchBox"
import { WorkerRow } from "../../components/dashboard/workers/WorkerRow"
import "../../dashboard.css"

// Pestañas. Filtran en el navegador: la API ya devuelve a todo el equipo.
const FILTERS = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Desactivados" },
]

// Filas grises que se ven mientras carga.
const SKELETON_ROWS = 5

// Título, frase y botón de crear. Sin onCreate, el botón no se pinta.
const PageHeader = ({ onCreate }) => (
    <div className="cf-workers__header">
        <div>
            <p className="cf-dash-eyebrow">Equipo</p>
            <h1 className="cf-workers__title">Trabajadores</h1>
            <p className="cf-workers__lede">
                Las personas del equipo, su turno y cómo las valoran los clientes. Desactivar a alguien lo quita
                de los huecos libres sin borrar su historial.
            </p>
        </div>

        {onCreate && (
            <button type="button" className="cf-dash-btn" onClick={onCreate}>
                <i className="fa-solid fa-plus" aria-hidden="true" />
                Nuevo trabajador
            </button>
        )}
    </div>
)

export const ListadoTrabajadores = () => {
    const { store, dispatch } = useGlobalReducer()
    const navigate = useNavigate()

    // ------------------------------------------------------------------
    // ESTADO
    // ------------------------------------------------------------------

    // Lista, pestaña elegida y texto del buscador
    const [workers, setWorkers] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [filter, setFilter] = useState("all")
    const [query, setQuery] = useState("")

    // Interruptor: togglingId bloquea solo el de la fila que se está guardando.
    const [togglingId, setTogglingId] = useState(null)
    const [toggleError, setToggleError] = useState("")

    // Confirmación: el trabajador que se va a desactivar, o null.
    const [confirming, setConfirming] = useState(null)
    const dialogRef = useRef(null)

    // ------------------------------------------------------------------
    // CARGA Y EFECTOS
    // ------------------------------------------------------------------

    const loadWorkers = async () => {
        setLoading(true)
        setLoadError("")

        const result = await getWorkers(store.token)

        if (result.ok) {
            setWorkers(result.data.workers)
        } else {
            setLoadError(result.data.error || result.data.msg || "No se han podido cargar los trabajadores.")
        }

        setLoading(false)
    }

    useEffect(() => {
        if (store.token) loadWorkers()
    }, [store.token])

    // showModal(): bloquea el resto de la página, cierra con Escape y
    // devuelve el foco al interruptor al cerrar.
    useEffect(() => {
        if (confirming) dialogRef.current?.showModal()
    }, [confirming])

    // ------------------------------------------------------------------
    // INTERRUPTOR Y CONFIRMACIÓN
    // ------------------------------------------------------------------

    const changeStatus = async (worker, isActive) => {
        setTogglingId(worker.worker_id)
        setToggleError("")

        const result = await toggleWorkerStatus(store.token, worker.worker_id, isActive)

        // 401 = token caducado: se cierra la sesión y ProtectedRoutes manda al login.
        if (result.status === 401) {
            dispatch({ type: "LOGOUT" })
            return
        }

        setTogglingId(null)

        if (!result.ok) {
            setToggleError(result.data.message)
            return
        }

        // La API devuelve el trabajador básico: se mezcla con la fila para
        // no perder la valoración, el turno ni la foto.
        setWorkers((current) =>
            current.map((item) => (item.worker_id === result.data.worker_id ? { ...item, ...result.data } : item))
        )
    }

    // Desactivar pide confirmación, porque afecta a sus reservas. Activar va directo.
    const handleSwitch = (worker) => {
        if (worker.is_active) {
            setConfirming(worker)
        } else {
            changeStatus(worker, true)
        }
    }

    // Cancelar, Escape y pulsar fuera pasan por close(): su onClose es el
    // único sitio que limpia `confirming`.
    const closeDialog = () => dialogRef.current?.close()

    const confirmDeactivate = () => {
        const worker = confirming
        closeDialog()
        changeStatus(worker, false)
    }

    // ------------------------------------------------------------------
    // BÚSQUEDA
    // ------------------------------------------------------------------

    // Al elegir una sugerencia se busca su nombre exacto. Si la pestaña
    // actual lo esconde, se vuelve a "Todos" para que se vea.
    const selectSuggestion = (option) => {
        const worker = workers.find((item) => item.worker_id === option.id)

        setQuery(option.name)

        if ((filter === "active" && !worker.is_active) || (filter === "inactive" && worker.is_active)) {
            setFilter("all")
        }
    }

    // ------------------------------------------------------------------
    // PANTALLA
    // ------------------------------------------------------------------

    if (loading) {
        return (
            <section className="cf-workers" aria-busy="true">
                <PageHeader />

                {/* Las barras grises no dicen nada a un lector de pantalla:
                    este texto sí, y no se ve. */}
                <p className="sr-only">Cargando trabajadores...</p>

                <ul className="cf-workers__list" aria-hidden="true">
                    <li className="cf-workers__head">
                        <span>Nombre</span>
                        <span>Puesto y turno</span>
                        <span>Valoración</span>
                        <span>Estado</span>
                        <span />
                    </li>

                    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                        <li className="cf-workers__row" key={index}>
                            <div className="cf-workers__person">
                                <span className="cf-dash-skel cf-skel-avatar" />
                                <div className="cf-workers__who">
                                    <span className="cf-dash-skel cf-workers__skel-name" />
                                    <span className="cf-dash-skel cf-workers__skel-sub" />
                                </div>
                            </div>
                            <div>
                                <span className="cf-dash-skel cf-workers__skel-fact" />
                                <span className="cf-dash-skel cf-workers__skel-sub" />
                            </div>
                            <div>
                                <span className="cf-dash-skel cf-workers__skel-fact" />
                            </div>
                            <div>
                                <span className="cf-dash-skel cf-workers__skel-switch" />
                            </div>
                            <div className="cf-workers__actions">
                                <span className="cf-dash-skel cf-workers__skel-btn" />
                                <span className="cf-dash-skel cf-workers__skel-btn" />
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="cf-workers">
                <PageHeader />

                <div className="cf-dash-state cf-dash-state--error" role="alert">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">No se han podido cargar los trabajadores</p>
                    <p className="cf-dash-state__text">{loadError}</p>
                    <button type="button" className="cf-dash-btn" onClick={loadWorkers}>
                        Reintentar
                    </button>
                </div>
            </section>
        )
    }

    const fullName = (worker) => `${worker.name} ${worker.last_name}`

    // Primero la búsqueda y después la pestaña: los contadores cuentan solo
    // lo encontrado. Se busca en el nombre, el puesto y el correo.
    const foundWorkers = workers.filter((worker) =>
        matchesSearch(query, fullName(worker), worker.position, worker.email)
    )
    const activeCount = foundWorkers.filter((worker) => worker.is_active).length
    const counts = { all: foundWorkers.length, active: activeCount, inactive: foundWorkers.length - activeCount }

    const visibleWorkers = foundWorkers.filter((worker) =>
        filter === "all" ? true : filter === "active" ? worker.is_active : !worker.is_active
    )

    // En las sugerencias, bajo el nombre van el puesto y el turno.
    const searchOptions = workers.map((worker) => ({
        id: worker.worker_id,
        name: fullName(worker),
        description: `${worker.position || ""} ${worker.email}`,
        meta: `${worker.position || "Sin puesto"} · ${worker.shift_name || "Sin turno"}`,
        active: worker.is_active,
    }))

    const searching = query.trim() !== ""

    return (
        <section className="cf-workers">
            <PageHeader onCreate={() => navigate("/dashboard/workers/new")} />

            {toggleError && (
                <p className="cf-dash-alert" role="alert">
                    {toggleError}
                </p>
            )}

            {workers.length === 0 ? (
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-users" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">Todavía no hay trabajadores</p>
                    <p className="cf-dash-state__text">Da de alta al primero para que pueda recibir reservas.</p>
                    <button type="button" className="cf-dash-btn" onClick={() => navigate("/dashboard/workers/new")}>
                        <i className="fa-solid fa-plus" aria-hidden="true" />
                        Añadir el primer trabajador
                    </button>
                </div>
            ) : (
                <>
                    {/* Pestañas a la izquierda y buscador a la derecha. aria-pressed
                        y no role="tab": son filtros de una misma lista. */}
                    <div className="cf-workers__toolbar">
                        <div className="cf-services__tabs" role="group" aria-label="Filtrar trabajadores">
                            {FILTERS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className="cf-services__tab"
                                    aria-pressed={filter === option.value}
                                    onClick={() => setFilter(option.value)}
                                >
                                    {option.label}
                                    {/* Los desactivados, en terracota: son lo que hay que mirar. */}
                                    <span
                                        className={`cf-services__count${
                                            option.value === "inactive" && counts.inactive > 0 ? " cf-dash-count--attention" : ""
                                        }`}
                                    >
                                        {counts[option.value]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <SearchBox
                            id="worker-search"
                            label="Buscar por nombre, puesto o correo"
                            value={query}
                            onChange={setQuery}
                            options={searchOptions}
                            inactiveLabel="Desactivado"
                            onSelect={selectSuggestion}
                        />
                    </div>

                    {searching && (
                        <p className="cf-dash-results" role="status">
                            <span>
                                {foundWorkers.length} {foundWorkers.length === 1 ? "resultado" : "resultados"} para «{query.trim()}»
                            </span>
                            <button type="button" onClick={() => setQuery("")}>
                                Borrar búsqueda
                            </button>
                        </p>
                    )}

                    {foundWorkers.length === 0 ? (
                        <div className="cf-dash-state">
                            <span className="cf-dash-state__icon">
                                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                            </span>
                            <p className="cf-dash-state__title">Nadie coincide con «{query.trim()}»</p>
                            <p className="cf-dash-state__text">
                                Prueba con otra palabra: se busca en el nombre, el puesto y el correo.
                            </p>
                            <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={() => setQuery("")}>
                                Borrar búsqueda
                            </button>
                        </div>
                    ) : visibleWorkers.length === 0 ? (
                        <div className="cf-dash-state">
                            <p className="cf-dash-state__text">
                                {filter === "active" ? "No hay trabajadores activos" : "No hay trabajadores desactivados"}
                                {searching ? " con esa búsqueda." : "."}
                            </p>
                        </div>
                    ) : (
                        <ul className="cf-workers__list">
                            {/* Cabecera de columnas: solo visual. En pantallas
                                estrechas se oculta y cada fila pasa a tarjeta. */}
                            <li className="cf-workers__head" aria-hidden="true">
                                <span>Nombre</span>
                                <span>Puesto y turno</span>
                                <span>Valoración</span>
                                <span>Estado</span>
                                <span />
                            </li>

                            {visibleWorkers.map((worker) => (
                                <WorkerRow
                                    key={worker.worker_id}
                                    worker={worker}
                                    query={query}
                                    isSelf={worker.user_id === store.user?.user_id}
                                    busy={togglingId === worker.worker_id}
                                    onSwitch={handleSwitch}
                                />
                            ))}
                        </ul>
                    )}
                </>
            )}

            {confirming && (
                // onClick en el propio dialog: solo llega aquí el clic en el
                // fondo oscuro, porque el contenido va dentro de __body.
                <dialog
                    ref={dialogRef}
                    className="cf-dash-modal"
                    aria-labelledby="confirm-title"
                    aria-describedby="confirm-text"
                    onClose={() => setConfirming(null)}
                    onClick={(event) => event.target === event.currentTarget && closeDialog()}
                >
                    <div className="cf-dash-modal__body">
                        <span className="cf-dash-modal__icon">
                            <i className="fa-solid fa-power-off" aria-hidden="true" />
                        </span>
                        <h2 className="cf-dash-modal__title" id="confirm-title">
                            ¿Desactivar a {fullName(confirming)}?
                        </h2>
                        <p className="cf-dash-modal__text" id="confirm-text">
                            Dejará de aparecer libre para reservas nuevas y no podrá entrar en la aplicación. Si
                            tiene reservas pendientes, pasarán a Reservas afectadas para que las reasignes. Su
                            historial se conserva y puedes volver a activarlo cuando quieras.
                        </p>
                        <div className="cf-dash-modal__actions">
                            {/* autoFocus en Cancelar: con Enter no se desactiva por error. */}
                            <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={closeDialog} autoFocus>
                                Cancelar
                            </button>
                            <button type="button" className="cf-dash-btn cf-dash-btn--danger" onClick={confirmDeactivate}>
                                Desactivar
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </section>
    )
}
