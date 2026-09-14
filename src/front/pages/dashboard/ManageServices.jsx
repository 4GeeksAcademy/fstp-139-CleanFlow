/**
 * CATÁLOGO DE SERVICIOS (ENCARGADO).
 *
 * Lista todos los servicios, también los desactivados, con pestañas y buscador.
 * El formulario (ServiceForm.jsx) se abre en lugar de la lista.
 * Nada se borra: se desactiva, porque hay reservas que apuntan a cada servicio.
 * Desactivar pide confirmación; activar no.
 *
 * API: services/serviceService.js · Estilos: dashboard.css (cf-dash-*, cf-services__*).
 */

import { useEffect, useRef, useState } from "react"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getAllServices, createService, updateService, toggleServiceStatus } from "../../services/serviceService"
import { ServiceForm, formatPrice, taskWord } from "../../components/dashboard/ServiceForm"
import { SearchBox, Highlight, matchesSearch } from "../../components/dashboard/SearchBox"
import "../../dashboard.css"

// Pestañas. Filtran en el navegador: la API ya devuelve todos los servicios.
const FILTERS = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Desactivados" },
]

// Lo que dura el resaltado de la fila guardada. Igual que la animación
// .cf-services__row--flash de dashboard.css.
const FLASH_MS = 1600

// Filas grises que se ven mientras carga.
const SKELETON_ROWS = 4

// Título, frase y botón de crear. Sin onCreate, el botón no se pinta.
const PageHeader = ({ onCreate }) => (
    <div className="cf-services__header">
        <div>
            {/* El grupo del sidebar al que pertenece la página. */}
            <p className="cf-dash-eyebrow">Administrar catálogo</p>
            <h1 className="cf-services__title">Catálogo de servicios</h1>
            <p className="cf-services__lede">
                Los tipos de limpieza que se contratan en la web. Desactivar uno lo oculta de la web sin borrarlo.
            </p>
        </div>

        {onCreate && (
            <button type="button" className="cf-dash-btn" onClick={onCreate}>
                <i className="fa-solid fa-plus" aria-hidden="true" />
                Nuevo servicio
            </button>
        )}
    </div>
)

export const ManageServices = () => {
    const { store, dispatch } = useGlobalReducer()

    // ------------------------------------------------------------------
    // ESTADO
    // ------------------------------------------------------------------

    // Lista y pestaña elegida
    const [services, setServices] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [filter, setFilter] = useState("all")

    // Texto del buscador
    const [query, setQuery] = useState("")

    // Formulario. editing: null = cerrado · { service: null } = creando · { service } = editando
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("")

    // Interruptor: togglingId bloquea solo el de la fila que se está guardando.
    const [togglingId, setTogglingId] = useState(null)
    const [toggleError, setToggleError] = useState("")

    // Confirmación: el servicio que se va a desactivar, o null.
    const [confirming, setConfirming] = useState(null)
    const dialogRef = useRef(null)

    // Fila resaltada tras guardar o elegir una sugerencia
    const [flashId, setFlashId] = useState(null)

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

    const loadServices = async () => {
        setLoading(true)
        setLoadError("")

        const result = await getAllServices(store.token)

        if (sessionExpired(result)) return

        if (result.ok) {
            setServices(result.data)
        } else {
            setLoadError(result.data.message)
        }

        setLoading(false)
    }

    useEffect(() => {
        loadServices()
    }, [store.token])

    // Apaga el resaltado pasado FLASH_MS. El return cancela el temporizador
    // si se guarda otra fila antes de que acabe.
    useEffect(() => {
        if (flashId === null) return

        const timer = setTimeout(() => setFlashId(null), FLASH_MS)
        return () => clearTimeout(timer)
    }, [flashId])

    // showModal() y no un div encima: el navegador bloquea el resto de la
    // página, cierra con Escape y, al cerrar, devuelve el foco al interruptor.
    useEffect(() => {
        if (confirming) dialogRef.current?.showModal()
    }, [confirming])

    // ------------------------------------------------------------------
    // FORMULARIO
    // ------------------------------------------------------------------

    const openForm = (service) => {
        setEditing({ service })
        setFormError("")
    }

    const closeForm = () => {
        setEditing(null)
        setFormError("")
    }

    // Recibe de ServiceForm los datos ya validados y convertidos.
    const handleSave = async (payload) => {
        setSaving(true)
        setFormError("")

        const result = editing.service
            ? await updateService(editing.service.service_id, payload, store.token)
            : await createService(payload, store.token)

        if (sessionExpired(result)) return

        setSaving(false)

        // Errores de la API (el 409 del nombre repetido, por ejemplo).
        // apiClient ya deja el texto en data.message.
        if (!result.ok) {
            setFormError(result.data.message)
            return
        }

        // Se actualiza la lista con lo que devuelve la API, sin recargar.
        setServices((current) =>
            editing.service
                ? current.map((service) => (service.service_id === result.data.service_id ? result.data : service))
                : [...current, result.data]
        )

        // Un servicio nuevo nace activo, y puede no coincidir con lo buscado:
        // se vuelve a "Todos" y se borra la búsqueda para que aparezca.
        if (!editing.service) {
            setFilter("all")
            setQuery("")
        }

        setFlashId(result.data.service_id)
        closeForm()
    }

    // ------------------------------------------------------------------
    // INTERRUPTOR Y CONFIRMACIÓN
    // ------------------------------------------------------------------

    const changeStatus = async (service, isActive) => {
        setTogglingId(service.service_id)
        setToggleError("")

        const result = await toggleServiceStatus(service.service_id, isActive, store.token)

        if (sessionExpired(result)) return

        setTogglingId(null)

        if (!result.ok) {
            setToggleError(result.data.message)
            return
        }

        setServices((current) =>
            current.map((item) => (item.service_id === result.data.service_id ? result.data : item))
        )
    }

    // Desactivar pide confirmación, porque el servicio deja de verse en la
    // web. Activar va directo.
    const handleSwitch = (service) => {
        if (service.is_active) {
            setConfirming(service)
        } else {
            changeStatus(service, true)
        }
    }

    // Cancelar, Escape y pulsar fuera pasan todos por close(): su evento
    // onClose es el único sitio que limpia `confirming`.
    const closeDialog = () => dialogRef.current?.close()

    const confirmDeactivate = () => {
        const service = confirming
        closeDialog()
        changeStatus(service, false)
    }

    // ------------------------------------------------------------------
    // BÚSQUEDA
    // ------------------------------------------------------------------

    // Al elegir una sugerencia se busca su nombre exacto y se ilumina. Si la
    // pestaña actual lo esconde, se vuelve a "Todos" para que se vea.
    const selectSuggestion = (option) => {
        const service = services.find((item) => item.service_id === option.id)

        setQuery(service.name)

        if ((filter === "active" && !service.is_active) || (filter === "inactive" && service.is_active)) {
            setFilter("all")
        }

        setFlashId(service.service_id)
    }

    // ------------------------------------------------------------------
    // PANTALLA
    // ------------------------------------------------------------------

    if (loading) {
        return (
            <section className="cf-services" aria-busy="true">
                <PageHeader />

                {/* Las barras grises no dicen nada a un lector de pantalla:
                    este texto sí, y no se ve. */}
                <p className="sr-only">Cargando servicios...</p>

                <ul className="cf-services__list" aria-hidden="true">
                    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                        <li className="cf-services__row" key={index}>
                            <div className="cf-services__info">
                                <span className="cf-dash-skel cf-services__skel-name" />
                                <span className="cf-dash-skel cf-services__skel-desc" />
                            </div>
                            <div className="cf-services__price">
                                <span className="cf-dash-skel cf-services__skel-fact" />
                            </div>
                            <div className="cf-services__tasks">
                                <span className="cf-dash-skel cf-services__skel-fact" />
                            </div>
                            <div className="cf-services__hours">
                                <span className="cf-dash-skel cf-services__skel-fact" />
                            </div>
                            <div className="cf-services__status">
                                <span className="cf-dash-skel cf-services__skel-status" />
                            </div>
                            <div className="cf-services__actions">
                                <span className="cf-dash-skel cf-services__skel-action" />
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="cf-services">
                <PageHeader />

                <div className="cf-dash-state cf-dash-state--error" role="alert">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">No se han podido cargar los servicios</p>
                    <p className="cf-dash-state__text">{loadError}</p>
                    <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={loadServices}>
                        Reintentar
                    </button>
                </div>
            </section>
        )
    }

    // Con el formulario abierto, ocupa el sitio de la lista: es largo, y
    // encima de ella dejaría la lista muy abajo en móvil.
    if (editing) {
        return (
            <section className="cf-services">
                <button type="button" className="cf-services__back" onClick={closeForm} disabled={saving}>
                    <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                    Volver a servicios
                </button>

                {/* key: al pasar de un servicio a otro, el formulario empieza
                    de cero con los datos del nuevo. */}
                <ServiceForm
                    key={editing.service ? editing.service.service_id : "new"}
                    service={editing.service}
                    saving={saving}
                    apiError={formError}
                    onSubmit={handleSave}
                    onCancel={closeForm}
                />
            </section>
        )
    }

    // Primero la búsqueda y después la pestaña. Los contadores de las
    // pestañas cuentan solo lo encontrado.
    const foundServices = services.filter((service) => matchesSearch(query, service.name, service.description))
    const activeCount = foundServices.filter((service) => service.is_active).length
    const counts = { all: foundServices.length, active: activeCount, inactive: foundServices.length - activeCount }

    const visibleServices = foundServices.filter((service) =>
        filter === "all" ? true : filter === "active" ? service.is_active : !service.is_active
    )

    // En las sugerencias, bajo el nombre va el precio y las tareas por hora.
    const searchOptions = services.map((service) => ({
        id: service.service_id,
        name: service.name,
        description: service.description,
        meta: `${formatPrice(service.base_hourly_rate)}/h · ${
            service.tasks_per_hour ? `${service.tasks_per_hour} ${taskWord(service.tasks_per_hour)} por hora` : "sin tareas"
        }`,
        active: service.is_active,
    }))

    const searching = query.trim() !== ""

    return (
        <section className="cf-services">
            <PageHeader onCreate={() => openForm(null)} />

            {toggleError && (
                <p className="cf-dash-alert cf-services__alert" role="alert">
                    {toggleError}
                </p>
            )}

            {services.length === 0 ? (
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-broom" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">Todavía no hay servicios</p>
                    <p className="cf-dash-state__text">Crea el primero para que se pueda contratar en la web.</p>
                    <button type="button" className="cf-dash-btn" onClick={() => openForm(null)}>
                        <i className="fa-solid fa-plus" aria-hidden="true" />
                        Crear el primer servicio
                    </button>
                </div>
            ) : (
                <>
                    {/* Pestañas a la izquierda y buscador a la derecha. aria-pressed
                        y no role="tab": son filtros de una misma lista. */}
                    <div className="cf-dash-toolbar">
                        <div className="cf-services__tabs">
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
                            id="service-search"
                            label="Buscar servicio"
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
                                {foundServices.length} {foundServices.length === 1 ? "resultado" : "resultados"} para «{query.trim()}»
                            </span>
                            <button type="button" onClick={() => setQuery("")}>
                                Borrar búsqueda
                            </button>
                        </p>
                    )}

                    {foundServices.length === 0 ? (
                        <div className="cf-dash-state">
                            <span className="cf-dash-state__icon">
                                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                            </span>
                            <p className="cf-dash-state__title">Ningún servicio coincide con «{query.trim()}»</p>
                            <p className="cf-dash-state__text">
                                Prueba con otra palabra: se busca en el nombre y en la descripción.
                            </p>
                            <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={() => setQuery("")}>
                                Borrar búsqueda
                            </button>
                        </div>
                    ) : visibleServices.length === 0 ? (
                        <div className="cf-dash-state">
                            <p className="cf-dash-state__text">
                                {filter === "active" ? "No hay servicios activos" : "No hay servicios desactivados"}
                                {searching ? " con esa búsqueda." : "."}
                            </p>
                        </div>
                    ) : (
                        <ul className="cf-services__list">
                            {/* Cabecera de columnas: solo visual. En pantallas
                                estrechas se oculta y cada dato lleva su etiqueta. */}
                            <li className="cf-services__head" aria-hidden="true">
                                <span>Servicio</span>
                                <span>Precio</span>
                                <span>Tareas</span>
                                <span>Horas</span>
                                <span>Estado</span>
                                <span className="cf-services__actions">Acciones</span>
                            </li>

                            {visibleServices.map((service) => {
                                const rowClass = [
                                    "cf-services__row",
                                    !service.is_active && "cf-services__row--inactive",
                                    flashId === service.service_id && "cf-services__row--flash",
                                ]
                                    .filter(Boolean)
                                    .join(" ")

                                return (
                                    <li key={service.service_id} className={rowClass}>
                                        <div className="cf-services__info">
                                            <p className="cf-services__name">
                                                <Highlight text={service.name} query={query} />
                                            </p>
                                            <p className="cf-services__desc">
                                                <Highlight text={service.description} query={query} />
                                            </p>
                                        </div>

                                        <div className="cf-services__fact cf-services__price">
                                            <span className="cf-services__label">Precio</span>
                                            <strong>{formatPrice(service.base_hourly_rate)}</strong>
                                            <span className="cf-services__sub">por hora</span>
                                        </div>

                                        {/* tasks_per_hour lo calcula la API; null = no lleva tareas. */}
                                        {service.tasks_per_hour ? (
                                            <div className="cf-services__fact cf-services__tasks">
                                                <span className="cf-services__label">Tareas</span>
                                                <strong>{service.minutes_per_task} min</strong>
                                                <span className="cf-services__sub">
                                                    {service.tasks_per_hour} {taskWord(service.tasks_per_hour)} por hora
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="cf-services__fact cf-services__fact--none cf-services__tasks">
                                                <span className="cf-services__label">Tareas</span>
                                                <strong>Sin tareas</strong>
                                                <span className="cf-services__sub">solo horas</span>
                                            </div>
                                        )}

                                        <div className="cf-services__fact cf-services__hours">
                                            <span className="cf-services__label">Horas</span>
                                            <strong>Desde {service.min_hours} h</strong>
                                            <span className="cf-services__sub">
                                                de {service.hour_step} en {service.hour_step}
                                                {service.max_hours && ` · máx. ${service.max_hours}`}
                                            </span>
                                        </div>

                                        <div className="cf-services__status">
                                            <label className="cf-dash-switch" htmlFor={`service-status-${service.service_id}`}>
                                                <input
                                                    id={`service-status-${service.service_id}`}
                                                    type="checkbox"
                                                    role="switch"
                                                    checked={service.is_active}
                                                    onChange={() => handleSwitch(service)}
                                                    disabled={togglingId === service.service_id}
                                                />
                                                <span className="cf-dash-switch__text">
                                                    {service.is_active ? "Activo" : "Desactivado"}
                                                </span>
                                            </label>
                                        </div>

                                        <div className="cf-services__actions">
                                            {/* aria-label: con muchos botones "Editar" iguales,
                                                el lector de pantalla necesita saber cuál es cuál. */}
                                            <button
                                                type="button"
                                                className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                                                onClick={() => openForm(service)}
                                                aria-label={`Editar ${service.name}`}
                                            >
                                                <i className="fa-solid fa-pen" aria-hidden="true" />
                                                Editar
                                            </button>
                                        </div>
                                    </li>
                                )
                            })}
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
                            <i className="fa-solid fa-eye-slash" aria-hidden="true" />
                        </span>
                        <h2 className="cf-dash-modal__title" id="confirm-title">
                            ¿Desactivar «{confirming.name}»?
                        </h2>
                        <p className="cf-dash-modal__text" id="confirm-text">
                            Dejará de verse en la web y los clientes no podrán reservarlo. Las reservas que ya
                            existen no cambian, y puedes volver a activarlo cuando quieras.
                        </p>
                        <div className="cf-dash-modal__actions">
                            {/* autoFocus en Cancelar: con Enter no se desactiva por error. */}
                            <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={closeDialog} autoFocus>
                                Cancelar
                            </button>
                            <button type="button" className="cf-dash-btn cf-dash-btn--danger" onClick={confirmDeactivate}>
                                Desactivar servicio
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </section>
    )
}
