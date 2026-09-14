/**
 * CATÁLOGO DE TAREAS (ENCARGADO).
 *
 * El encargado ve todas las tareas —también las desactivadas—, crea
 * nuevas, edita su nombre o su descripción, y las activa o desactiva.
 *
 * Nunca se borra nada: desactivar es lo que sustituye al borrado, porque
 * hay reservas que apuntan a cada tarea.
 *
 * Solo habla con la API a través de services/taskService.js.
 * Estilos en dashboard.css: clases cf-dash-* (compartidas) y cf-tasks__*.
 */

import { useEffect, useState } from "react"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getAllTasks, createTask, updateTask, toggleTaskStatus } from "../../services/taskService"
import { SearchBox, Highlight, matchesSearch } from "../../components/dashboard/SearchBox"
import "../../dashboard.css"

// Mismo tope que la columna task_name en models.py y que la API.
const TASK_NAME_MAX_LENGTH = 100

const EMPTY_FORM = { task_name: "", description: "" }

// Pestañas. Filtran en el navegador: la API ya devuelve todas las tareas.
const FILTERS = [
    { value: "all", label: "Todas" },
    { value: "active", label: "Activas" },
    { value: "inactive", label: "Desactivadas" },
]

// Lo que dura el resaltado de la fila guardada. Igual que la animación
// .cf-tasks__row--flash de dashboard.css.
const FLASH_MS = 1600

// Filas grises que se ven mientras carga.
const SKELETON_ROWS = 6

// Título, frase y botón de crear. Sin onCreate, el botón no se pinta.
const PageHeader = ({ onCreate }) => (
    <div className="cf-tasks__header">
        <div>
            {/* El grupo del sidebar al que pertenece la página. */}
            <p className="cf-dash-eyebrow">Administrar catálogo</p>
            <h1 className="cf-tasks__title">Catálogo de tareas</h1>
            <p className="cf-tasks__lede">
                Las tareas que se pueden incluir en los servicios. Desactivar una la
                oculta de los servicios nuevos sin borrarla.
            </p>
        </div>

        {onCreate && (
            <button type="button" className="cf-dash-btn" onClick={onCreate}>
                <i className="fa-solid fa-plus" aria-hidden="true" />
                Nueva tarea
            </button>
        )}
    </div>
)

export const ManageTasks = () => {
    const { store, dispatch } = useGlobalReducer()

    // ---- La lista ----
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [filter, setFilter] = useState("all")

    // ---- La búsqueda ----
    const [query, setQuery] = useState("")

    // ---- El formulario ----
    // null: cerrado · { task: null }: creando · { task }: editando esa tarea
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [formError, setFormError] = useState("")
    const [saving, setSaving] = useState(false)

    // ---- El interruptor de cada fila ----
    // Guarda qué tarea se está cambiando, para bloquear solo su interruptor.
    const [togglingId, setTogglingId] = useState(null)
    const [toggleError, setToggleError] = useState("")

    // ---- La fila que se ilumina tras guardar ----
    const [flashId, setFlashId] = useState(null)

    // Un 401 significa que el token ha caducado. Se cierra la sesión y
    // ProtectedRoutes, al ver que ya no hay token, manda al login.
    // Devuelve true si ha pasado, para que quien llama deje de hacer cosas.
    const sessionExpired = (result) => {
        if (result.status === 401) {
            dispatch({ type: "LOGOUT" })
            return true
        }
        return false
    }

    const loadTasks = async () => {
        setLoading(true)
        setLoadError("")

        const result = await getAllTasks(store.token)

        if (sessionExpired(result)) return

        if (result.ok) {
            setTasks(result.data)
        } else {
            setLoadError(result.data.message)
        }

        setLoading(false)
    }

    useEffect(() => {
        loadTasks()
    }, [store.token])

    // Apaga el resaltado pasado FLASH_MS. El return cancela el temporizador
    // si se guarda otra fila antes de que acabe.
    useEffect(() => {
        if (flashId === null) return

        const timer = setTimeout(() => setFlashId(null), FLASH_MS)
        return () => clearTimeout(timer)
    }, [flashId])

    // ------------------------------------------------------------------
    // FORMULARIO
    // ------------------------------------------------------------------

    const openCreate = () => {
        setEditing({ task: null })
        setForm(EMPTY_FORM)
        setFormError("")
    }

    const openEdit = (task) => {
        setEditing({ task })
        // description puede venir null: el campo de texto necesita "".
        setForm({ task_name: task.task_name, description: task.description || "" })
        setFormError("")
    }

    const closeForm = () => {
        setEditing(null)
        setFormError("")
    }

    const handleChange = (event) => {
        setForm({ ...form, [event.target.name]: event.target.value })
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (saving) return

        // La misma regla que la API, antes de enviar: el aviso sale al
        // momento y se ahorra un viaje. La API lo vuelve a comprobar igual.
        const name = form.task_name.trim()

        if (!name) {
            setFormError("El nombre de la tarea es obligatorio")
            return
        }

        if (name.length > TASK_NAME_MAX_LENGTH) {
            setFormError(`El nombre no puede superar los ${TASK_NAME_MAX_LENGTH} caracteres`)
            return
        }

        setSaving(true)
        setFormError("")

        // Descripción vacía → null: así "sin descripción" se guarda siempre
        // igual, y al editar se puede borrar la que había.
        const payload = { task_name: name, description: form.description.trim() || null }

        const result = editing.task
            ? await updateTask(editing.task.task_id, payload, store.token)
            : await createTask(payload, store.token)

        if (sessionExpired(result)) return

        setSaving(false)

        // Aquí llegan los errores de la API: el 409 del nombre repetido, por
        // ejemplo. apiClient ya deja el texto en data.message.
        if (!result.ok) {
            setFormError(result.data.message)
            return
        }

        // Se actualiza la lista con lo que devuelve la API, sin recargar.
        setTasks((current) =>
            editing.task
                ? current.map((task) => (task.task_id === result.data.task_id ? result.data : task))
                : [...current, result.data]
        )

        // Una tarea nueva nace activa, y puede no coincidir con lo buscado:
        // se vuelve a "Todas" y se borra la búsqueda para que aparezca.
        if (!editing.task) {
            setFilter("all")
            setQuery("")
        }

        setFlashId(result.data.task_id)
        closeForm()
    }

    // ------------------------------------------------------------------
    // INTERRUPTOR
    // ------------------------------------------------------------------

    const handleToggle = async (task) => {
        setTogglingId(task.task_id)
        setToggleError("")

        const result = await toggleTaskStatus(task.task_id, !task.is_active, store.token)

        if (sessionExpired(result)) return

        setTogglingId(null)

        if (!result.ok) {
            setToggleError(result.data.message)
            return
        }

        setTasks((current) =>
            current.map((item) => (item.task_id === result.data.task_id ? result.data : item))
        )
    }

    // ------------------------------------------------------------------
    // BÚSQUEDA
    // ------------------------------------------------------------------

    // Al elegir una sugerencia se busca su nombre exacto y se ilumina. Si la
    // pestaña actual la esconde, se vuelve a "Todas" para que se vea.
    const selectSuggestion = (option) => {
        const task = tasks.find((item) => item.task_id === option.id)

        setQuery(task.task_name)

        if ((filter === "active" && !task.is_active) || (filter === "inactive" && task.is_active)) {
            setFilter("all")
        }

        setFlashId(task.task_id)
    }

    // ------------------------------------------------------------------
    // PANTALLA
    // ------------------------------------------------------------------

    if (loading) {
        return (
            <section className="cf-tasks" aria-busy="true">
                <PageHeader />

                {/* Las barras grises no dicen nada a un lector de pantalla:
                    este texto sí, y no se ve. */}
                <p className="sr-only">Cargando tareas...</p>

                <ul className="cf-tasks__list" aria-hidden="true">
                    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                        <li className="cf-tasks__row" key={index}>
                            <div className="cf-tasks__info">
                                <span className="cf-dash-skel cf-tasks__skel-name" />
                                <span className="cf-dash-skel cf-tasks__skel-desc" />
                            </div>
                            <div className="cf-tasks__status">
                                <span className="cf-dash-skel cf-tasks__skel-status" />
                            </div>
                            <div className="cf-tasks__actions">
                                <span className="cf-dash-skel cf-tasks__skel-action" />
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="cf-tasks">
                <PageHeader />

                <div className="cf-dash-state cf-dash-state--error" role="alert">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">No se han podido cargar las tareas</p>
                    <p className="cf-dash-state__text">{loadError}</p>
                    <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={loadTasks}>
                        Reintentar
                    </button>
                </div>
            </section>
        )
    }

    // Primero la búsqueda y después la pestaña. Los contadores de las
    // pestañas cuentan solo lo encontrado.
    const foundTasks = tasks.filter((task) => matchesSearch(query, task.task_name, task.description))
    const activeCount = foundTasks.filter((task) => task.is_active).length
    const counts = { all: foundTasks.length, active: activeCount, inactive: foundTasks.length - activeCount }

    const visibleTasks = foundTasks.filter((task) =>
        filter === "all" ? true : filter === "active" ? task.is_active : !task.is_active
    )

    const searchOptions = tasks.map((task) => ({
        id: task.task_id,
        name: task.task_name,
        description: task.description,
        meta: task.description,
        active: task.is_active,
    }))

    const searching = query.trim() !== ""

    return (
        <section className="cf-tasks">
            {/* Sin botón mientras el formulario está abierto: así no se
                empiezan dos cosas a la vez. */}
            <PageHeader onCreate={editing ? null : openCreate} />

            {editing && (
                // key: al pasar de editar una tarea a otra, el formulario se
                // monta de nuevo y autoFocus vuelve a llevar hasta él.
                // noValidate: las reglas se comprueban en handleSubmit, con
                // los mismos textos que la API.
                <form
                    key={editing.task ? editing.task.task_id : "new"}
                    className="cf-tasks__form"
                    onSubmit={handleSubmit}
                    noValidate
                >
                    <h2 className="cf-tasks__form-title">{editing.task ? "Editar tarea" : "Nueva tarea"}</h2>

                    {formError && (
                        <p className="cf-dash-alert" role="alert">
                            {formError}
                        </p>
                    )}

                    <div className="cf-dash-field">
                        <label htmlFor="task_name" className="cf-dash-field__label">
                            Nombre
                        </label>
                        <input
                            id="task_name"
                            name="task_name"
                            className="cf-dash-input"
                            value={form.task_name}
                            onChange={handleChange}
                            maxLength={TASK_NAME_MAX_LENGTH}
                            placeholder="Por ejemplo: Limpiar persianas"
                            aria-describedby="task_name_count"
                            autoFocus
                        />
                        <span id="task_name_count" className="cf-dash-field__hint">
                            {form.task_name.length}/{TASK_NAME_MAX_LENGTH}
                        </span>
                    </div>

                    <div className="cf-dash-field">
                        <label htmlFor="description" className="cf-dash-field__label">
                            Descripción <span className="cf-dash-field__optional">(opcional)</span>
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            className="cf-dash-input"
                            rows={2}
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Qué incluye la tarea"
                        />
                    </div>

                    <div className="cf-tasks__form-actions">
                        <button type="submit" className="cf-dash-btn" disabled={saving}>
                            {saving ? "Guardando..." : editing.task ? "Guardar cambios" : "Crear tarea"}
                        </button>
                        <button
                            type="button"
                            className="cf-dash-btn cf-dash-btn--ghost"
                            onClick={closeForm}
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {toggleError && (
                <p className="cf-dash-alert cf-tasks__alert" role="alert">
                    {toggleError}
                </p>
            )}

            {tasks.length === 0 ? (
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-clipboard-check" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">Todavía no hay tareas</p>
                    <p className="cf-dash-state__text">Crea la primera y podrás añadirla a los servicios.</p>
                    {!editing && (
                        <button type="button" className="cf-dash-btn" onClick={openCreate}>
                            <i className="fa-solid fa-plus" aria-hidden="true" />
                            Crear la primera tarea
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Pestañas a la izquierda y buscador a la derecha, sobre la
                        misma línea. aria-pressed y no role="tab": son botones de
                        filtro sobre la misma lista, no paneles distintos. */}
                    <div className="cf-dash-toolbar">
                        <div className="cf-tasks__tabs">
                            {FILTERS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className="cf-tasks__tab"
                                    aria-pressed={filter === option.value}
                                    onClick={() => setFilter(option.value)}
                                >
                                    {option.label}
                                    {/* Las desactivadas, en terracota: son lo que hay que mirar. */}
                                    <span
                                        className={`cf-tasks__count${
                                            option.value === "inactive" && counts.inactive > 0 ? " cf-dash-count--attention" : ""
                                        }`}
                                    >
                                        {counts[option.value]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <SearchBox
                            id="task-search"
                            label="Buscar tarea"
                            value={query}
                            onChange={setQuery}
                            options={searchOptions}
                            inactiveLabel="Desactivada"
                            onSelect={selectSuggestion}
                        />
                    </div>

                    {searching && (
                        <p className="cf-dash-results" role="status">
                            <span>
                                {foundTasks.length} {foundTasks.length === 1 ? "resultado" : "resultados"} para «{query.trim()}»
                            </span>
                            <button type="button" onClick={() => setQuery("")}>
                                Borrar búsqueda
                            </button>
                        </p>
                    )}

                    {foundTasks.length === 0 ? (
                        <div className="cf-dash-state">
                            <span className="cf-dash-state__icon">
                                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                            </span>
                            <p className="cf-dash-state__title">Ninguna tarea coincide con «{query.trim()}»</p>
                            <p className="cf-dash-state__text">
                                Prueba con otra palabra: se busca en el nombre y en la descripción.
                            </p>
                            <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={() => setQuery("")}>
                                Borrar búsqueda
                            </button>
                        </div>
                    ) : visibleTasks.length === 0 ? (
                        <div className="cf-dash-state">
                            <p className="cf-dash-state__text">
                                {filter === "active" ? "No hay tareas activas" : "No hay tareas desactivadas"}
                                {searching ? " con esa búsqueda." : "."}
                            </p>
                        </div>
                    ) : (
                        <ul className="cf-tasks__list">
                            {/* Cabecera de columnas: solo visual, cada fila
                                ya se entiende sola. */}
                            <li className="cf-tasks__head" aria-hidden="true">
                                <span>Tarea</span>
                                <span>Estado</span>
                                <span className="cf-tasks__actions">Acciones</span>
                            </li>

                            {visibleTasks.map((task) => {
                                const rowClass = [
                                    "cf-tasks__row",
                                    !task.is_active && "cf-tasks__row--inactive",
                                    flashId === task.task_id && "cf-tasks__row--flash",
                                ]
                                    .filter(Boolean)
                                    .join(" ")

                                return (
                                    <li key={task.task_id} className={rowClass}>
                                        <div className="cf-tasks__info">
                                            <p className="cf-tasks__name">
                                                <Highlight text={task.task_name} query={query} />
                                            </p>
                                            {task.description ? (
                                                <p className="cf-tasks__desc">
                                                    <Highlight text={task.description} query={query} />
                                                </p>
                                            ) : (
                                                <p className="cf-tasks__desc cf-tasks__desc--empty">Sin descripción</p>
                                            )}
                                        </div>

                                        <div className="cf-tasks__status">
                                            <label className="cf-dash-switch" htmlFor={`task-status-${task.task_id}`}>
                                                <input
                                                    id={`task-status-${task.task_id}`}
                                                    type="checkbox"
                                                    role="switch"
                                                    checked={task.is_active}
                                                    onChange={() => handleToggle(task)}
                                                    disabled={togglingId === task.task_id}
                                                />
                                                <span className="cf-dash-switch__text">
                                                    {task.is_active ? "Activa" : "Desactivada"}
                                                </span>
                                            </label>
                                        </div>

                                        <div className="cf-tasks__actions">
                                            {/* aria-label: con veinte botones "Editar" iguales,
                                                el lector de pantalla necesita saber cuál es cuál. */}
                                            <button
                                                type="button"
                                                className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                                                onClick={() => openEdit(task)}
                                                disabled={saving}
                                                aria-label={`Editar ${task.task_name}`}
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
        </section>
    )
}
