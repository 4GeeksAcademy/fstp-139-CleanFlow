/**
 * TURNOS (ENCARGADO).
 *
 * Los horarios del equipo: nombre, horas y días de la semana. Cada
 * trabajador tiene un turno, y sus días y horas deciden cuándo se le puede
 * reservar (#69).
 *
 * Mismo diseño que tareas y servicios: pestañas para filtrar, formulario
 * que se abre encima de la lista e interruptor para activar y desactivar.
 * Desactivar un turno con trabajadores pide confirmación; eliminar solo se
 * permite si no tiene ninguno.
 *
 * API: services/shiftService.js · Estilos: dashboard.css (cf-dash-*,
 * cf-shifts__* y las pestañas cf-tasks__*, que se reutilizan).
 */

import { useEffect, useRef, useState } from "react"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import {
    getShifts,
    createShift,
    updateShift,
    toggleShiftStatus,
    deleteShift,
} from "../../services/shiftService"
import "../../dashboard.css"

// Mismo tope que la columna name de Shift y que la API.
const NAME_MAX_LENGTH = 50

// Lunes = 1 ... domingo = 7, como Shift.days en el backend.
const WEEKDAYS = [
    { value: 1, short: "Lun", long: "lunes" },
    { value: 2, short: "Mar", long: "martes" },
    { value: 3, short: "Mié", long: "miércoles" },
    { value: 4, short: "Jue", long: "jueves" },
    { value: 5, short: "Vie", long: "viernes" },
    { value: 6, short: "Sáb", long: "sábado" },
    { value: 7, short: "Dom", long: "domingo" },
]

// Atajos del formulario: los horarios que se usan casi siempre.
const PRESETS = [
    { label: "Lunes a viernes", days: [1, 2, 3, 4, 5] },
    { label: "Lunes a sábado", days: [1, 2, 3, 4, 5, 6] },
    { label: "Todos los días", days: [1, 2, 3, 4, 5, 6, 7] },
]

// Un turno nuevo trabaja de lunes a viernes, como el valor por defecto de
// la base de datos.
const EMPTY_FORM = { name: "", start_time: "", end_time: "", work_days: [1, 2, 3, 4, 5] }

const FILTERS = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Desactivados" },
]

// Lo que dura el resaltado de la fila guardada. Igual que la animación
// .cf-tasks__row--flash de dashboard.css.
const FLASH_MS = 1600

const SKELETON_ROWS = 3


// ----------------------------------------------------------------------
// AYUDANTES DE TEXTO
// ----------------------------------------------------------------------

// "08:00" -> 480. Así se restan dos horas sin pelearse con fechas.
const toMinutes = (hhmm) => {
    const [hours, minutes] = hhmm.split(":").map(Number)
    return hours * 60 + minutes
}

// 360 -> "6 h" · 390 -> "6 h 30 min"
const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest ? `${hours} h ${rest} min` : `${hours} h`
}

// Los días en una frase corta: "Lun a sáb", "Sáb y dom", "Lun, mié y vie".
const summarizeDays = (days) => {
    const sorted = [...days].sort((a, b) => a - b)
    const names = sorted.map((day) => WEEKDAYS[day - 1].short.toLowerCase())

    if (sorted.length === 7) return "Todos los días"

    const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)
    const consecutive = sorted.every((day, index) => index === 0 || day === sorted[index - 1] + 1)

    // Tres o más seguidos se leen mejor como un tramo.
    if (consecutive && sorted.length >= 3) {
        return `${capitalize(names[0])} a ${names[names.length - 1]}`
    }

    if (names.length === 1) return `Solo ${names[0]}`

    const list = `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`
    return capitalize(list)
}

const workersLabel = (count) => (count === 1 ? "trabajador" : "trabajadores")


// ----------------------------------------------------------------------
// CABECERA
// ----------------------------------------------------------------------

// Sin onCreate, el botón no se pinta (mientras carga o con el formulario abierto).
const PageHeader = ({ onCreate }) => (
    <div className="cf-shifts__header">
        <div>
            <p className="cf-dash-eyebrow">Equipo</p>
            <h1 className="cf-shifts__title">Turnos</h1>
            <p className="cf-shifts__lede">
                Los horarios del equipo. Cada trabajador tiene un turno, y sus días y horas deciden
                cuándo se le puede reservar.
            </p>
        </div>

        {onCreate && (
            <button type="button" className="cf-dash-btn" onClick={onCreate}>
                <i className="fa-solid fa-plus" aria-hidden="true" />
                Nuevo turno
            </button>
        )}
    </div>
)


export const ListadoTurnos = () => {
    const { store, dispatch } = useGlobalReducer()

    // ------------------------------------------------------------------
    // ESTADO
    // ------------------------------------------------------------------

    // Lista y pestaña elegida
    const [shifts, setShifts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [filter, setFilter] = useState("all")

    // Formulario. editing: null = cerrado · { shift: null } = creando · { shift } = editando
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [formError, setFormError] = useState("")
    const [saving, setSaving] = useState(false)

    // Interruptor y papelera: bloquean solo la fila que se está guardando.
    const [busyId, setBusyId] = useState(null)
    const [rowError, setRowError] = useState("")

    // Ventana de confirmación. { type: "deactivate" | "delete" | "blocked", shift }
    const [dialog, setDialog] = useState(null)
    const dialogRef = useRef(null)

    // Fila resaltada tras guardar
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

    const loadShifts = async () => {
        setLoading(true)
        setLoadError("")

        const result = await getShifts(store.token)

        if (sessionExpired(result)) return

        if (result.ok) {
            setShifts(result.data)
        } else {
            setLoadError(result.data.message)
        }

        setLoading(false)
    }

    useEffect(() => {
        loadShifts()
    }, [store.token])

    useEffect(() => {
        if (flashId === null) return

        const timer = setTimeout(() => setFlashId(null), FLASH_MS)
        return () => clearTimeout(timer)
    }, [flashId])

    // showModal() y no un div encima: el navegador bloquea el resto de la
    // página, cierra con Escape y devuelve el foco al botón que la abrió.
    useEffect(() => {
        if (dialog) dialogRef.current?.showModal()
    }, [dialog])

    // Actualiza un turno en la lista, dejándola ordenada por hora de inicio.
    const replaceShift = (saved) => {
        setShifts((current) => {
            const exists = current.some((shift) => shift.shift_id === saved.shift_id)
            const next = exists
                ? current.map((shift) => (shift.shift_id === saved.shift_id ? saved : shift))
                : [...current, saved]

            return next.sort((a, b) => a.start_time.localeCompare(b.start_time))
        })
    }

    // ------------------------------------------------------------------
    // FORMULARIO
    // ------------------------------------------------------------------

    const openCreate = () => {
        setEditing({ shift: null })
        setForm(EMPTY_FORM)
        setFormError("")
    }

    const openEdit = (shift) => {
        setEditing({ shift })
        setForm({
            name: shift.name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            work_days: shift.work_days,
        })
        setFormError("")
    }

    const closeForm = () => {
        setEditing(null)
        setFormError("")
    }

    const handleChange = (event) => {
        setForm({ ...form, [event.target.name]: event.target.value })
    }

    const toggleDay = (day) => {
        const days = form.work_days.includes(day)
            ? form.work_days.filter((item) => item !== day)
            : [...form.work_days, day]

        setForm({ ...form, work_days: days })
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (saving) return

        // Mismas reglas que la API, para avisar al momento. La API lo vuelve
        // a comprobar igual.
        const name = form.name.trim()

        if (!name) {
            setFormError("El nombre del turno es obligatorio")
            return
        }

        if (!form.start_time || !form.end_time) {
            setFormError("Indica la hora de inicio y la de fin")
            return
        }

        if (toMinutes(form.start_time) >= toMinutes(form.end_time)) {
            setFormError("La hora de fin debe ser posterior a la de inicio")
            return
        }

        if (form.work_days.length === 0) {
            setFormError("Elige al menos un día de la semana")
            return
        }

        setSaving(true)
        setFormError("")

        const payload = {
            name,
            start_time: form.start_time,
            end_time: form.end_time,
            work_days: form.work_days,
        }

        const result = editing.shift
            ? await updateShift(editing.shift.shift_id, payload, store.token)
            : await createShift(payload, store.token)

        if (sessionExpired(result)) return

        setSaving(false)

        if (!result.ok) {
            setFormError(result.data.message)
            return
        }

        replaceShift(result.data)

        // Un turno nuevo nace activo: se vuelve a "Todos" para que se vea.
        if (!editing.shift) setFilter("all")

        setFlashId(result.data.shift_id)
        closeForm()
    }

    // ------------------------------------------------------------------
    // ACTIVAR, DESACTIVAR Y ELIMINAR
    // ------------------------------------------------------------------

    const changeStatus = async (shift, isActive) => {
        setBusyId(shift.shift_id)
        setRowError("")

        const result = await toggleShiftStatus(shift.shift_id, isActive, store.token)

        if (sessionExpired(result)) return

        setBusyId(null)

        if (!result.ok) {
            setRowError(result.data.message)
            return
        }

        replaceShift(result.data)
    }

    // Desactivar un turno con trabajadores pide confirmación: deja de ofrecer
    // sus huecos. Sin trabajadores, o para activar, va directo.
    const handleSwitch = (shift) => {
        if (shift.is_active && shift.workers.length > 0) {
            setDialog({ type: "deactivate", shift })
        } else {
            changeStatus(shift, !shift.is_active)
        }
    }

    // Con trabajadores no se puede borrar: se explica antes de llamar a la
    // API, en vez de esperar su 409.
    const handleDelete = (shift) => {
        setDialog({ type: shift.workers.length > 0 ? "blocked" : "delete", shift })
    }

    const removeShift = async (shift) => {
        setBusyId(shift.shift_id)
        setRowError("")

        const result = await deleteShift(shift.shift_id, store.token)

        if (sessionExpired(result)) return

        setBusyId(null)

        if (!result.ok) {
            setRowError(result.data.message)
            return
        }

        setShifts((current) => current.filter((item) => item.shift_id !== shift.shift_id))

        // Si se estaba editando el turno borrado, el formulario ya no tiene sentido.
        if (editing?.shift?.shift_id === shift.shift_id) closeForm()
    }

    // Cancelar, Escape y pulsar fuera pasan todos por close(): su evento
    // onClose es el único sitio que limpia `dialog`.
    const closeDialog = () => dialogRef.current?.close()

    const confirmDialog = () => {
        const { type, shift } = dialog
        closeDialog()

        if (type === "deactivate") changeStatus(shift, false)
        if (type === "delete") removeShift(shift)
    }

    // ------------------------------------------------------------------
    // PANTALLA
    // ------------------------------------------------------------------

    if (loading) {
        return (
            <section className="cf-shifts" aria-busy="true">
                <PageHeader />

                <p className="sr-only">Cargando turnos...</p>

                <ul className="cf-shifts__list" aria-hidden="true">
                    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                        <li className="cf-shifts__row" key={index}>
                            <div className="cf-shifts__info">
                                <span className="cf-dash-skel cf-shifts__skel-name" />
                                <span className="cf-dash-skel cf-shifts__skel-line" />
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="cf-shifts">
                <PageHeader />

                <div className="cf-dash-state cf-dash-state--error" role="alert">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">No se han podido cargar los turnos</p>
                    <p className="cf-dash-state__text">{loadError}</p>
                    <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={loadShifts}>
                        Reintentar
                    </button>
                </div>
            </section>
        )
    }

    const activeCount = shifts.filter((shift) => shift.is_active).length
    const counts = { all: shifts.length, active: activeCount, inactive: shifts.length - activeCount }

    const visibleShifts = shifts.filter((shift) =>
        filter === "all" ? true : filter === "active" ? shift.is_active : !shift.is_active
    )

    // Duración que se enseña en el formulario mientras se escribe.
    const formMinutes =
        form.start_time && form.end_time ? toMinutes(form.end_time) - toMinutes(form.start_time) : null

    return (
        <section className="cf-shifts">
            {/* Sin botón mientras el formulario está abierto: así no se
                empiezan dos cosas a la vez. */}
            <PageHeader onCreate={editing ? null : openCreate} />

            {editing && (
                // key: al pasar de editar un turno a otro, el formulario se
                // monta de nuevo y autoFocus vuelve a llevar hasta él.
                <form
                    key={editing.shift ? editing.shift.shift_id : "new"}
                    className="cf-shifts__form"
                    onSubmit={handleSubmit}
                    noValidate
                >
                    <h2 className="cf-shifts__form-title">{editing.shift ? "Editar turno" : "Nuevo turno"}</h2>

                    {formError && (
                        <p className="cf-dash-alert" role="alert">
                            {formError}
                        </p>
                    )}

                    {/* Tres columnas: el nombre ocupa la fila entera y debajo van
                        inicio, fin y duración, los tres a la misma altura. */}
                    <div className="cf-shifts__grid">
                        <div className="cf-dash-field cf-shifts__wide">
                            <div className="cf-shifts__label-row">
                                <label htmlFor="shift-name" className="cf-dash-field__label">
                                    Nombre
                                </label>
                                <span id="shift-name-count" className="cf-dash-field__hint">
                                    {form.name.length}/{NAME_MAX_LENGTH}
                                </span>
                            </div>
                            <input
                                id="shift-name"
                                name="name"
                                className="cf-dash-input"
                                value={form.name}
                                onChange={handleChange}
                                maxLength={NAME_MAX_LENGTH}
                                placeholder="Por ejemplo: Mañana"
                                aria-describedby="shift-name-count"
                                autoFocus
                            />
                        </div>

                        <div className="cf-dash-field">
                            <label htmlFor="shift-start" className="cf-dash-field__label">
                                Hora de inicio
                            </label>
                            <input
                                id="shift-start"
                                name="start_time"
                                type="time"
                                step="1800"
                                className="cf-dash-input"
                                value={form.start_time}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="cf-dash-field">
                            <label htmlFor="shift-end" className="cf-dash-field__label">
                                Hora de fin
                            </label>
                            <input
                                id="shift-end"
                                name="end_time"
                                type="time"
                                step="1800"
                                className="cf-dash-input"
                                value={form.end_time}
                                onChange={handleChange}
                            />
                        </div>

                        {/* La duración no se escribe: se calcula de las dos horas. */}
                        <div className="cf-dash-field">
                            <span id="shift-duration-label" className="cf-dash-field__label">
                                Duración
                            </span>
                            <output
                                className={`cf-shifts__stat${formMinutes !== null && formMinutes <= 0 ? " cf-shifts__stat--error" : ""}`}
                                aria-labelledby="shift-duration-label"
                                aria-live="polite"
                            >
                                {formMinutes === null ? (
                                    "—"
                                ) : formMinutes > 0 ? (
                                    <>
                                        {formatDuration(formMinutes)} <small>por jornada</small>
                                    </>
                                ) : (
                                    "El fin va antes del inicio"
                                )}
                            </output>
                        </div>
                    </div>

                    <div className="cf-shifts__days" role="group" aria-labelledby="shift-days-label">
                        <div className="cf-shifts__days-head">
                            <span id="shift-days-label" className="cf-dash-field__label">
                                Días de trabajo
                            </span>
                            <div className="cf-shifts__presets">
                                {PRESETS.map((preset, index) => (
                                    <span key={preset.label} className="cf-shifts__preset-item">
                                        {index > 0 && <span aria-hidden="true">·</span>}
                                        <button
                                            type="button"
                                            className="cf-shifts__preset"
                                            onClick={() => setForm({ ...form, work_days: preset.days })}
                                        >
                                            {preset.label}
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Casillas de verdad con aspecto de pastilla (cf-dash-chip):
                            funcionan con teclado y lector de pantalla. */}
                        <div className="cf-dash-chips">
                            {WEEKDAYS.map((day) => (
                                <label key={day.value} className="cf-dash-chip" htmlFor={`shift-day-${day.value}`}>
                                    <input
                                        id={`shift-day-${day.value}`}
                                        type="checkbox"
                                        checked={form.work_days.includes(day.value)}
                                        onChange={() => toggleDay(day.value)}
                                        aria-label={day.long}
                                    />
                                    <span aria-hidden="true">{day.short}</span>
                                </label>
                            ))}
                        </div>

                        {form.work_days.length === 0 && (
                            <p className="cf-dash-field__error">Elige al menos un día de la semana</p>
                        )}
                    </div>

                    <div className="cf-shifts__form-actions">
                        <button type="submit" className="cf-dash-btn" disabled={saving}>
                            {saving ? "Guardando..." : editing.shift ? "Guardar cambios" : "Crear turno"}
                        </button>
                        <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={closeForm} disabled={saving}>
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {rowError && (
                <p className="cf-dash-alert cf-shifts__alert" role="alert">
                    {rowError}
                </p>
            )}

            {shifts.length === 0 ? (
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-clock" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">Todavía no hay turnos</p>
                    <p className="cf-dash-state__text">Crea el primero y podrás asignárselo a los trabajadores.</p>
                    {!editing && (
                        <button type="button" className="cf-dash-btn" onClick={openCreate}>
                            <i className="fa-solid fa-plus" aria-hidden="true" />
                            Crear el primer turno
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Las mismas pestañas que tareas y servicios. aria-pressed y
                        no role="tab": son filtros de una misma lista. */}
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
                                    {/* Los desactivados, en terracota: son lo que hay que mirar. */}
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
                    </div>

                    {visibleShifts.length === 0 ? (
                        <div className="cf-dash-state">
                            <p className="cf-dash-state__text">
                                {filter === "active" ? "No hay turnos activos." : "No hay turnos desactivados."}
                            </p>
                        </div>
                    ) : (
                        <ul className="cf-shifts__list">
                            {/* Cabecera de columnas: solo visual, cada fila ya se
                                entiende sola. */}
                            <li className="cf-shifts__head" aria-hidden="true">
                                <span>Turno</span>
                                <span>Días</span>
                                <span>Asignados</span>
                                <span>Estado</span>
                                <span className="cf-shifts__actions">Acciones</span>
                            </li>

                            {visibleShifts.map((shift) => {
                                const rowClass = [
                                    "cf-shifts__row",
                                    !shift.is_active && "cf-shifts__row--inactive",
                                    flashId === shift.shift_id && "cf-tasks__row--flash",
                                ]
                                    .filter(Boolean)
                                    .join(" ")

                                const minutes = toMinutes(shift.end_time) - toMinutes(shift.start_time)
                                const workers = shift.workers.length

                                return (
                                    <li key={shift.shift_id} className={rowClass}>
                                        <div className="cf-shifts__info">
                                            <p className="cf-shifts__name">{shift.name}</p>
                                            <p className="cf-shifts__hours">
                                                {shift.start_time} – {shift.end_time} · {formatDuration(minutes)}
                                            </p>
                                        </div>

                                        <div className="cf-shifts__daycell">
                                            <p className="cf-shifts__daytext">{summarizeDays(shift.work_days)}</p>
                                            {/* Tira de siete marcas: la semana de un vistazo. */}
                                            <div className="cf-shifts__week" aria-hidden="true">
                                                {WEEKDAYS.map((day) => (
                                                    <span
                                                        key={day.value}
                                                        className={shift.work_days.includes(day.value) ? "is-on" : undefined}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {workers > 0 ? (
                                            <p className="cf-shifts__team">
                                                <span className="cf-shifts__count">{workers}</span>
                                                {workersLabel(workers)}
                                            </p>
                                        ) : (
                                            <p className="cf-shifts__team cf-shifts__team--none">Ninguno todavía</p>
                                        )}

                                        <div className="cf-shifts__status">
                                            <label className="cf-dash-switch" htmlFor={`shift-status-${shift.shift_id}`}>
                                                <input
                                                    id={`shift-status-${shift.shift_id}`}
                                                    type="checkbox"
                                                    role="switch"
                                                    checked={shift.is_active}
                                                    onChange={() => handleSwitch(shift)}
                                                    disabled={busyId === shift.shift_id}
                                                />
                                                {/* Apagado no dice nada a la vista (el interruptor
                                                    ya lo dice), pero sí al lector de pantalla. */}
                                                <span className={`cf-dash-switch__text${shift.is_active ? "" : " sr-only"}`}>
                                                    {shift.is_active ? "Activo" : "Desactivado"}
                                                </span>
                                            </label>
                                        </div>

                                        <div className="cf-shifts__actions">
                                            <button
                                                type="button"
                                                className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                                                onClick={() => openEdit(shift)}
                                                disabled={saving}
                                                aria-label={`Editar ${shift.name}`}
                                            >
                                                <i className="fa-solid fa-pen" aria-hidden="true" />
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                className="cf-shifts__delete"
                                                onClick={() => handleDelete(shift)}
                                                disabled={busyId === shift.shift_id}
                                                aria-label={`Eliminar ${shift.name}`}
                                                title="Eliminar turno"
                                            >
                                                <i className="fa-solid fa-trash-can" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </>
            )}

            {dialog && (
                // onClick en el propio dialog: solo llega aquí el clic en el
                // fondo oscuro, porque el contenido va dentro de __body.
                <dialog
                    ref={dialogRef}
                    className="cf-dash-modal"
                    aria-labelledby="shift-dialog-title"
                    aria-describedby="shift-dialog-text"
                    onClose={() => setDialog(null)}
                    onClick={(event) => event.target === event.currentTarget && closeDialog()}
                >
                    <div className="cf-dash-modal__body">
                        {dialog.type === "deactivate" && (
                            <>
                                <span className="cf-dash-modal__icon">
                                    <i className="fa-solid fa-power-off" aria-hidden="true" />
                                </span>
                                <h2 className="cf-dash-modal__title" id="shift-dialog-title">
                                    ¿Desactivar el turno «{dialog.shift.name}»?
                                </h2>
                                <p className="cf-dash-modal__text" id="shift-dialog-text">
                                    Sus {dialog.shift.workers.length} {workersLabel(dialog.shift.workers.length)} dejarán
                                    de aparecer libres para reservas nuevas. Las reservas que ya tienen no cambian, y
                                    puedes volver a activarlo cuando quieras.
                                </p>
                            </>
                        )}

                        {dialog.type === "delete" && (
                            <>
                                <span className="cf-dash-modal__icon">
                                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
                                </span>
                                <h2 className="cf-dash-modal__title" id="shift-dialog-title">
                                    ¿Eliminar el turno «{dialog.shift.name}»?
                                </h2>
                                <p className="cf-dash-modal__text" id="shift-dialog-text">
                                    Se borra para siempre. No tiene trabajadores, así que no afecta a nadie.
                                </p>
                            </>
                        )}

                        {dialog.type === "blocked" && (
                            <>
                                <span className="cf-dash-modal__icon">
                                    <i className="fa-solid fa-user-group" aria-hidden="true" />
                                </span>
                                <h2 className="cf-dash-modal__title" id="shift-dialog-title">
                                    «{dialog.shift.name}» tiene {dialog.shift.workers.length}{" "}
                                    {workersLabel(dialog.shift.workers.length)}
                                </h2>
                                <p className="cf-dash-modal__text" id="shift-dialog-text">
                                    Cambia a sus trabajadores a otro turno desde su ficha y después podrás eliminarlo.
                                    O desactívalo: se conserva, pero deja de ofrecer huecos.
                                </p>
                            </>
                        )}

                        <div className="cf-dash-modal__actions">
                            {dialog.type === "blocked" ? (
                                <button type="button" className="cf-dash-btn" onClick={closeDialog} autoFocus>
                                    Entendido
                                </button>
                            ) : (
                                <>
                                    {/* autoFocus en Cancelar: con Enter no se confirma por error. */}
                                    <button
                                        type="button"
                                        className="cf-dash-btn cf-dash-btn--ghost"
                                        onClick={closeDialog}
                                        autoFocus
                                    >
                                        Cancelar
                                    </button>
                                    <button type="button" className="cf-dash-btn cf-dash-btn--danger" onClick={confirmDialog}>
                                        {dialog.type === "deactivate" ? "Desactivar turno" : "Eliminar turno"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </dialog>
            )}
        </section>
    )
}
