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
import { Link, useSearchParams } from "react-router-dom"
import useGlobalReducer from "../../../hooks/useGlobalReducer"
import { getServices } from "../../../services/serviceService"
import { getTasks } from "../../../services/taskService"
import { getAddresses, createAddress } from "../../../services/addressService"
import { getAvailability, getBookableWorkers } from "../../../services/availabilityService"
import { createBooking } from "../../../services/bookingService"
import { AddressForm } from "../../../components/dashboard/AddressForm"
import { formatPrice, taskWord } from "../../../components/dashboard/ServiceForm"
import { hoursNeeded, hourOptions, spareTasks, splitIntoDays, totalPrice } from "./bookingRules"
import { BookingCalendar } from "../../../components/dashboard/booking/BookingCalendar"
import { ANY_WORKER, WorkerPicker } from "../../../components/dashboard/booking/WorkerPicker"
import "../../../dashboard.css"

// Nombre del parámetro con el que llega el servicio elegido. Es un CONTRATO
// con ServiceCatalog.jsx: si cambia aquí, cambia allí.
const SERVICE_PARAM = "servicio"

// Bloques grises que se ven mientras carga.
const SKELETON_BLOCKS = 3

// Hasta dónde se puede reservar. El mismo valor que BOOKING_HORIZON en
// availability.py: con él se calcula hasta qué mes llegan las flechas.
const BOOKING_HORIZON_DAYS = 60

/** Una fecha en "2026-10", el formato que pide la API. */
const monthOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

/** Suma meses a un "2026-10". */
const shiftMonth = (month, step) => {
    const [year, number] = month.split("-").map(Number)

    return monthOf(new Date(year, number - 1 + step, 1))
}

// Las direcciones del cliente se gestionan en sus ajustes (#13).
const ADDRESSES_PATH = "/dashboard/profile/addresses"

// Las reservas del cliente, donde acaba la confirmación (#16).
const BOOKINGS_PATH = "/dashboard/contracted-services"

// El mismo tope que client_notes en la API.
const NOTES_MAX_LENGTH = 1000

/** "Calle de Alcalá 42, 3º B · 28014 Madrid". */
const addressText = (address) => {
    const floor = address.floor ? `, ${address.floor}` : ""

    return `${address.street} ${address.number}${floor} · ${address.postal_code} ${address.city}`
}

/** "2026-10-05" -> "lun 5 oct", para el resumen. */
const dayText = (key) => {
    const [year, month, day] = key.split("-").map(Number)
    const text = new Date(year, month - 1, day).toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
    })

    // El navegador devuelve "lun., 5 oct."; aquí se lee mejor sin puntuación.
    return text.replace(/[.,]/g, "")
}

/** Un tramo ya reservado: "lun 5 oct · 09:00 a 11:00". */
const bookedDayText = (bookedDay) => {
    const [date, time] = bookedDay.starts_at.split("T")

    return `${dayText(date)} · ${time.slice(0, 5)} a ${bookedDay.ends_at.split("T")[1].slice(0, 5)}`
}

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

/** "1 h" · "1 h 30 min": lo que suman las tareas elegidas. */
const taskTimeText = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60

    if (!hours) return `${rest} min`

    return rest ? `${hours} h ${rest} min` : `${hours} h`
}

// ----------------------------------------------------------------------
// COMPONENTE
// ----------------------------------------------------------------------

export const BookingPanel = () => {
    const { store, dispatch } = useGlobalReducer()
    const [searchParams] = useSearchParams()

    const [services, setServices] = useState([])
    const [tasks, setTasks] = useState([])
    const [workers, setWorkers] = useState([])
    const [addresses, setAddresses] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")

    // Lo que va eligiendo el cliente. chosenTasks guarda ids CON repeticiones:
    // tres habitaciones son tres veces el mismo id, como espera la API.
    const [slug, setSlug] = useState("")
    const [chosenTasks, setChosenTasks] = useState([])
    const [hours, setHours] = useState(0)
    const [worker, setWorker] = useState(ANY_WORKER)

    // La tarea que está marcada en el desplegable de "Añadir", todavía sin
    // añadir. Vacío = la primera de la lista.
    const [taskToAdd, setTaskToAdd] = useState("")

    // Los huecos del mes que se está viendo: {"2026-10-05": [{start, options}]}.
    const [month, setMonth] = useState(monthOf(new Date()))
    const [slots, setSlots] = useState({})
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [slotsError, setSlotsError] = useState("")
    const [day, setDay] = useState("")
    const [start, setStart] = useState("")

    // La dirección elegida y el formulario de crear una sin salir del panel.
    const [addressId, setAddressId] = useState("")
    const [addingAddress, setAddingAddress] = useState(false)
    const [savingAddress, setSavingAddress] = useState(false)
    const [addressError, setAddressError] = useState("")

    // La reserva: mientras se guarda, si falla, y la que devuelve la API.
    const [notes, setNotes] = useState("")
    const [booking, setBooking] = useState(null)
    const [saving, setSaving] = useState(false)
    const [bookingError, setBookingError] = useState("")

    // Sube de uno en uno para volver a pedir los huecos tras un 409.
    const [slotsReload, setSlotsReload] = useState(0)

    const loadCatalog = async () => {
        setLoading(true)
        setLoadError("")

        // Las cuatro a la vez: ninguna necesita a las otras.
        const [servicesResult, tasksResult, workersResult, addressesResult] = await Promise.all([
            getServices(),
            getTasks(),
            getBookableWorkers(store.token),
            getAddresses(store.token),
        ])

        // 401 = token caducado: se cierra la sesión y ProtectedRoutes manda
        // al login.
        if (workersResult.status === 401 || addressesResult.status === 401) {
            dispatch({ type: "LOGOUT" })
            return
        }

        if (servicesResult.ok && tasksResult.ok && workersResult.ok && addressesResult.ok) {
            setServices(servicesResult.data)
            setTasks(tasksResult.data)
            setWorkers(workersResult.data)
            setAddresses(addressesResult.data)

            // La principal viene primera. Sin ninguna, el formulario de
            // crear sale abierto: sin dirección no hay reserva.
            const [main] = addressesResult.data

            setAddressId(main ? String(main.address_id) : "")
            setAddingAddress(!main)

            // El servicio de la URL, solo si sigue estando activo. Si no, se
            // queda sin elegir y el desplegable lo pide.
            const wanted = searchParams.get(SERVICE_PARAM)
            const found = servicesResult.data.find((service) => service.slug === wanted)

            setSlug(found ? wanted : "")
            setHours(found ? hoursNeeded(found, 0) : 0)
        } else {
            // Un solo mensaje: si fallan varias, suele ser por lo mismo.
            const failed = [servicesResult, tasksResult, workersResult, addressesResult]
                .find((result) => !result.ok)

            setLoadError(failed.data.message)
        }

        setLoading(false)
    }

    // Solo al entrar: cambiar el desplegable no recarga el catálogo.
    useEffect(() => {
        loadCatalog()
    }, [])

    // "Gestionar mis direcciones" abre otra pestaña, así que al volver a
    // esta la lista puede haber cambiado. Se vuelve a pedir sin tocar nada
    // más de la reserva.
    useEffect(() => {
        const refreshAddresses = async () => {
            const result = await getAddresses(store.token)

            if (!result.ok) return

            setAddresses(result.data)

            // Si la elegida ya no está (la quitaron allí), vuelve la principal.
            setAddressId((current) => {
                if (result.data.some((item) => String(item.address_id) === current)) return current

                const [main] = result.data

                return main ? String(main.address_id) : ""
            })
        }

        window.addEventListener("focus", refreshAddresses)

        return () => window.removeEventListener("focus", refreshAddresses)
    }, [store.token])

    // Los huecos se recalculan cada vez que cambia algo que los afecta: las
    // horas, el trabajador o el mes.
    useEffect(() => {
        if (!slug || !hours) {
            setSlots({})
            return
        }

        // Si el cliente cambia rápido, la respuesta vieja no debe pisar a la
        // nueva: solo se hace caso a la última petición.
        let current = true

        const loadSlots = async () => {
            setSlotsLoading(true)
            setSlotsError("")

            const result = await getAvailability({ hours, month, worker }, store.token)

            if (!current) return

            if (result.status === 401) {
                dispatch({ type: "LOGOUT" })
                return
            }

            if (result.ok) {
                setSlots(result.data)
            } else {
                setSlots({})
                setSlotsError(result.data.message)
            }

            setSlotsLoading(false)
        }

        loadSlots()

        return () => {
            current = false
        }
    }, [slug, hours, worker, month, slotsReload, store.token])

    // El día y la hora elegidos pueden dejar de estar libres al cambiar las
    // horas o el trabajador: entonces se desmarcan.
    useEffect(() => {
        if (day && !slots[day]) {
            setDay("")
            setStart("")
        } else if (start && !slots[day]?.some((slot) => slot.start === start)) {
            setStart("")
        }
    }, [slots, day, start])

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

    // Fin de obra no lleva tareas: se contrata solo por horas.
    const withTasks = Boolean(service && service.minutes_per_task !== null)

    const needed = service ? hoursNeeded(service, chosenTasks.length) : 0
    const spare = service ? spareTasks(service, hours, chosenTasks.length) : 0

    // Tareas que caben en el tope del servicio: con esencial (8 h y 20 min
    // por tarea) son 24. Sin tope, las que quiera.
    const maxTasks = withTasks && service.max_hours
        ? Math.floor((service.max_hours * 60) / service.minutes_per_task)
        : Infinity

    const roomForTasks = chosenTasks.length < maxTasks

    // El número de cada paso: sin tareas, todos los de después suben uno.
    const shift = withTasks ? 0 : -1
    const step = {
        service: 1,
        tasks: 2,
        hours: 3 + shift,
        worker: 4 + shift,
        when: 5 + shift,
        address: 6 + shift,
        notes: 7 + shift,
    }

    const chosenAddress = addresses.find((item) => String(item.address_id) === addressId) || null

    const chosenWorker = workers.find((item) => String(item.worker_id) === worker) || null

    // Hasta qué mes llegan las flechas: del actual al del último día que se
    // puede reservar.
    const today = new Date()
    const firstMonth = monthOf(today)
    const lastMonth = monthOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() + BOOKING_HORIZON_DAYS))

    // Los tramos de la hora elegida. Con "Cualquiera" todas las opciones
    // ocupan los mismos días, así que vale con mirar la primera.
    const chosenSlot = slots[day]?.find((slot) => slot.start === start)
    const bookedDays = chosenSlot ? chosenSlot.options[0].days : []
    const spillDays = bookedDays.slice(1)

    // Qué falta para poder reservar, en el orden de los pasos. El backend lo
    // valida todo otra vez: esto solo evita un viaje en balde.
    const missing = !service ? "Elige un servicio"
        : withTasks && chosenTasks.length === 0 ? "Añade al menos una tarea"
            : !start ? "Elige el día y la hora"
                : !addressId ? "Elige una dirección"
                    : ""

    const canBook = !missing && !saving

    // ------------------------------------------------------------------
    // CAMBIOS DEL FORMULARIO
    // ------------------------------------------------------------------

    // Al cambiar de servicio se vacían las tareas y las horas vuelven al
    // mínimo: las de un servicio no valen para otro.
    const changeService = (nextSlug) => {
        const next = services.find((item) => item.slug === nextSlug) || null

        setSlug(nextSlug)
        setChosenTasks([])
        setHours(next ? hoursNeeded(next, 0) : 0)
    }

    // Las horas siguen siempre a las tareas: suben al añadir y bajan al
    // quitar. Si el cliente las sube a mano, se quedan hasta que vuelva a
    // tocar las tareas.
    const changeTasks = (next) => {
        setChosenTasks(next)
        setHours(hoursNeeded(service, next.length))
    }

    const addTask = (taskId) => changeTasks([...chosenTasks, taskId])

    // Se quita por posición y no por id: la misma tarea puede estar repetida.
    const removeTask = (index) => changeTasks(chosenTasks.filter((_, position) => position !== index))

    // Crea una dirección sin salir del panel y la deja elegida. La lista se
    // vuelve a pedir para que la principal siga saliendo la primera.
    const saveAddress = async (fields) => {
        setSavingAddress(true)
        setAddressError("")

        const created = await createAddress(fields, store.token)

        if (created.status === 401) {
            dispatch({ type: "LOGOUT" })
            return
        }

        if (!created.ok) {
            setAddressError(created.data.message)
            setSavingAddress(false)
            return
        }

        const list = await getAddresses(store.token)

        if (list.ok) setAddresses(list.data)

        setAddressId(String(created.data.address_id))
        setAddingAddress(false)
        setSavingAddress(false)
    }

    // Reserva de verdad. El precio no se envía: lo calcula el servidor.
    const book = async () => {
        setSaving(true)
        setBookingError("")

        const result = await createBooking({
            service_slug: slug,
            task_ids: chosenTasks,
            hours,
            worker: worker === ANY_WORKER ? ANY_WORKER : Number(worker),
            start: `${day}T${start}`,
            address_id: Number(addressId),
            notes,
        }, store.token)

        if (result.status === 401) {
            dispatch({ type: "LOGOUT" })
            return
        }

        if (result.ok) {
            setBooking(result.data)
            return
        }

        setBookingError(result.data.message)
        setSaving(false)

        // 409: alguien ha cogido el hueco mientras el cliente decidía. Se
        // desmarca la hora y se piden los huecos otra vez.
        if (result.status === 409) {
            setStart("")
            setSlotsReload((current) => current + 1)
        }
    }

    // Volver a empezar sin recargar la página: se conserva lo ya cargado
    // (catálogo, trabajadores y direcciones) y se olvida lo elegido.
    const bookAnother = () => {
        setBooking(null)
        setChosenTasks([])
        setHours(hoursNeeded(service, 0))
        setWorker(ANY_WORKER)
        setDay("")
        setStart("")
        setNotes("")
        setBookingError("")
        setSaving(false)
    }

    const taskById = (taskId) => tasks.find((task) => task.task_id === taskId)

    // Sin tocar el desplegable, se añade la primera de la lista.
    const [firstTask] = tasks
    const nextTaskId = Number(taskToAdd) || firstTask?.task_id

    // ---- CONFIRMACIÓN ----
    // Reservado: en lugar del formulario se enseña lo contratado, con lo que
    // devuelve la API (no lo que eligió el cliente: manda el servidor).
    if (booking) {
        return (
            <section className="cf-booking">
                <div className="cf-booking__done">
                    <div className="cf-booking__done-icon">
                        <i className="fa-solid fa-check" aria-hidden="true" />
                    </div>

                    <h1 className="cf-booking__done-title">¡Reserva confirmada!</h1>
                    <p className="cf-booking__done-text">
                        {`${booking.worker.name} irá a tu casa el ${dayText(booking.days[0].starts_at.split("T")[0])}.`}
                    </p>

                    <div className="cf-booking__rows">
                        <dl className="cf-booking__row">
                            <dt>Servicio</dt>
                            <dd>
                                {booking.service.name}
                                {booking.tasks.length
                                    ? ` · ${booking.tasks.length} ${taskWord(booking.tasks.length)}`
                                    : ""}
                            </dd>
                        </dl>
                        <dl className="cf-booking__row">
                            <dt>Quién</dt>
                            <dd>{booking.worker.name}</dd>
                        </dl>
                        <dl className="cf-booking__row cf-booking__row--days">
                            <dt>Cuándo</dt>
                            <dd>
                                {booking.days.map((bookedDay) => (
                                    <span key={bookedDay.booking_day_id}>{bookedDayText(bookedDay)}</span>
                                ))}
                            </dd>
                        </dl>
                        <dl className="cf-booking__row">
                            <dt>Dónde</dt>
                            <dd>{addressText(booking.address)}</dd>
                        </dl>
                        <dl className="cf-booking__row">
                            <dt>Total</dt>
                            <dd>
                                <strong>{formatPrice(booking.total_price)}</strong>
                                {` (${booking.hours} h × ${formatPrice(booking.hourly_rate)}/h)`}
                            </dd>
                        </dl>
                    </div>

                    <p className="cf-booking__cancel-note">Puedes cancelar hasta 1 hora antes</p>

                    <div className="cf-booking__done-actions">
                        <Link className="cf-dash-btn" to={BOOKINGS_PATH}>
                            Ver mis servicios
                        </Link>
                        <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={bookAnother}>
                            Contratar otro servicio
                        </button>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className="cf-booking">
            <PageHeader />

            <div className="cf-booking__layout">
                <div className="cf-booking__steps">

                    {/* ---- 1 · SERVICIO ---- */}
                    <section className="cf-booking__block">
                        <BlockHead step={step.service} title="Servicio" />

                        <div className="cf-dash-field">
                            <label className="cf-dash-field__label" htmlFor="booking-service">
                                ¿Qué necesitas?
                            </label>
                            <select
                                id="booking-service"
                                className="cf-dash-input"
                                value={slug}
                                onChange={(event) => changeService(event.target.value)}
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
                                    <i className="fa-solid fa-tag" aria-hidden="true" />
                                    {` ${formatPrice(service.base_hourly_rate)}/hora`}
                                </li>
                                {withTasks && (
                                    <li>
                                        <i className="fa-solid fa-clock" aria-hidden="true" />
                                        {` ${service.minutes_per_task} min por tarea`}
                                    </li>
                                )}
                                <li>
                                    <i className="fa-solid fa-hourglass-start" aria-hidden="true" />
                                    {` De ${service.min_hours} a ${service.max_hours || "muchas"} h`}
                                </li>
                            </ul>
                        )}
                    </section>

                    {/* ---- 2 · TAREAS ----
                        Solo en los servicios que las llevan. */}
                    {withTasks && (
                        <section className="cf-booking__block">
                            <BlockHead
                                step={step.tasks}
                                title="Tareas"
                                note={`${chosenTasks.length} ${taskWord(chosenTasks.length)} · ${taskTimeText(chosenTasks.length * service.minutes_per_task)}`}
                            />

                            {chosenTasks.length > 0 && (
                                <ul className="cf-booking__tasks">
                                    {chosenTasks.map((taskId, index) => (
                                        // La clave lleva la posición: la misma tarea
                                        // puede repetirse y su id no es único aquí.
                                        <li className="cf-booking__task" key={`${taskId}-${index}`}>
                                            <span className="cf-booking__task-name">
                                                {taskById(taskId)?.task_name}
                                            </span>
                                            <span className="cf-booking__task-time">
                                                {service.minutes_per_task} min
                                            </span>
                                            <button
                                                type="button"
                                                className="cf-booking__remove"
                                                onClick={() => removeTask(index)}
                                                aria-label={`Quitar ${taskById(taskId)?.task_name}`}
                                            >
                                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="cf-booking__add">
                                <select
                                    id="booking-task"
                                    className="cf-dash-input"
                                    value={nextTaskId || ""}
                                    onChange={(event) => setTaskToAdd(event.target.value)}
                                    disabled={!roomForTasks}
                                    aria-label="Tarea que añadir"
                                >
                                    {tasks.map((task) => (
                                        <option key={task.task_id} value={task.task_id}>
                                            {task.task_name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="cf-dash-btn cf-dash-btn--ghost"
                                    disabled={!nextTaskId || !roomForTasks}
                                    onClick={() => addTask(nextTaskId)}
                                >
                                    <i className="fa-solid fa-plus" aria-hidden="true" />
                                    Añadir
                                </button>
                            </div>

                            {chosenTasks.length === 0 && (
                                <p className="cf-booking__hint">
                                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                    {" Añade al menos una tarea para poder reservar."}
                                </p>
                            )}

                            {/* El tope del servicio manda: con 8 h no caben más
                                de 24 tareas de 20 minutos. */}
                            {!roomForTasks && (
                                <p className="cf-booking__hint">
                                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                                    {` En ${service.max_hours} h caben ${maxTasks} ${taskWord(maxTasks)}: quita alguna para añadir otra.`}
                                </p>
                            )}

                            {spare > 0 && chosenTasks.length > 0 && (
                                <p className="cf-booking__hint">
                                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                    {` Te ${spare === 1 ? "cabe" : "caben"} ${spare} ${taskWord(spare)} más en ${hours} h: la hora se cobra entera igual.`}
                                </p>
                            )}
                        </section>
                    )}

                    {/* ---- 3 · HORAS ---- */}
                    {service && (
                        <section className="cf-booking__block">
                            <BlockHead step={step.hours} title="Horas" />

                            <div className="cf-booking__hours">
                                <div className="cf-dash-field">
                                    <label className="cf-dash-field__label" htmlFor="booking-hours">
                                        Duración
                                    </label>
                                    <select
                                        id="booking-hours"
                                        className="cf-dash-input"
                                        value={hours}
                                        onChange={(event) => setHours(Number(event.target.value))}
                                    >
                                        {hourOptions(service, chosenTasks.length).map((option) => (
                                            <option key={option} value={option}>
                                                {option} {option === 1 ? "hora" : "horas"}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <p className="cf-booking__price-line">
                                    {withTasks && chosenTasks.length > 0
                                        ? `Tus tareas necesitan ${needed} h · `
                                        : `Desde ${needed} h · `}
                                    <strong>
                                        {hours} h × {formatPrice(service.base_hourly_rate)}/h
                                    </strong>
                                </p>
                            </div>
                        </section>
                    )}

                    {/* ---- 4 · QUIÉN VIENE ----
                        "Cualquiera" no es un trabajador: lo elige la
                        disponibilidad, y así hay más huecos libres. */}
                    {service && (
                        <section className="cf-booking__block">
                            <BlockHead
                                step={step.worker}
                                title="Quién viene"
                                note={workers.length ? null : "Ahora mismo no hay nadie disponible"}
                            />

                            <WorkerPicker
                                workers={workers}
                                value={worker}
                                onChange={setWorker}
                            />
                        </section>
                    )}

                    {/* ---- 5 · DÍA Y HORA ----
                        Los huecos los calcula la API: solo salen los días y
                        las horas en las que la reserva entera cabe. */}
                    {service && (
                        <section className="cf-booking__block">
                            <BlockHead
                                step={step.when}
                                title="Día y hora"
                                note={`Hasta ${BOOKING_HORIZON_DAYS} días vista`}
                            />

                            {slotsError && (
                                <p className="cf-dash-alert" role="alert">
                                    {slotsError}
                                </p>
                            )}

                            <BookingCalendar
                                days={slots}
                                month={month}
                                chosen={day}
                                spill={spillDays}
                                loading={slotsLoading}
                                canGoBack={month > firstMonth}
                                canGoForward={month < lastMonth}
                                onMonthChange={(offset) => setMonth(shiftMonth(month, offset))}
                                onChoose={(key) => {
                                    setDay(key)
                                    setStart("")
                                }}
                            />

                            {/* Solo al elegir día: antes no hay horas que enseñar. */}
                            {day && (
                                <div className="cf-booking__slots">
                                    <p className="cf-booking__slots-title">
                                        Horas libres del {dayText(day)}
                                    </p>

                                    {slots[day].map((slot) => (
                                        <button
                                            type="button"
                                            className={`cf-booking__slot${slot.start === start ? " cf-booking__slot--chosen" : ""}`}
                                            key={slot.start}
                                            aria-pressed={slot.start === start}
                                            onClick={() => setStart(slot.start)}
                                        >
                                            {slot.start}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Reserva de varios días: se avisa antes de reservar. */}
                            {bookedDays.length > 1 && (
                                <p className="cf-booking__hint cf-booking__hint--ok">
                                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                    {` Una jornada son 8 h, así que esta reserva ocupará ${bookedDays.length} días con el mismo trabajador.`}
                                </p>
                            )}

                            {!slotsLoading && !slotsError && Object.keys(slots).length === 0 && (
                                <p className="cf-booking__hint">
                                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                    {" Este mes no queda ningún hueco. Prueba con otro mes o con menos horas."}
                                </p>
                            )}
                        </section>
                    )}

                    {/* ---- 6 · DIRECCIÓN ----
                        Las direcciones son las de la #13: aquí solo se elige
                        una o se crea, con el mismo formulario de los ajustes. */}
                    {service && (
                        <section className="cf-booking__block">
                            <BlockHead step={step.address} title="Dirección" />

                            {addingAddress ? (
                                <AddressForm
                                    saving={savingAddress}
                                    apiError={addressError}
                                    onSubmit={saveAddress}
                                    onCancel={() => setAddingAddress(false)}
                                />
                            ) : (
                                <>
                                    {/* Sin direcciones no hay desplegable que enseñar. */}
                                    {addresses.length === 0 ? (
                                        <p className="cf-booking__hint">
                                            <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                            {" Todavía no tienes ninguna dirección: añade dónde quieres que vayamos."}
                                        </p>
                                    ) : (
                                        <div className="cf-dash-field">
                                            <label className="cf-dash-field__label" htmlFor="booking-address">
                                                ¿Dónde limpiamos?
                                            </label>
                                            <select
                                                id="booking-address"
                                                className="cf-dash-input"
                                                value={addressId}
                                                onChange={(event) => setAddressId(event.target.value)}
                                            >
                                                {addresses.map((item) => (
                                                    <option key={item.address_id} value={item.address_id}>
                                                        {addressText(item)}
                                                        {item.is_default ? " (principal)" : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="cf-booking__address-links">
                                        <button
                                            type="button"
                                            className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                                            onClick={() => setAddingAddress(true)}
                                        >
                                            <i className="fa-solid fa-plus" aria-hidden="true" />
                                            Añadir dirección
                                        </button>
                                        {/* En otra pestaña: si se saliera del panel, se
                                            perdería todo lo elegido. Al volver, la lista
                                            se actualiza sola. */}
                                        <Link
                                            className="cf-booking__link"
                                            to={ADDRESSES_PATH}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Gestionar mis direcciones
                                            <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                                            <span className="sr-only">(se abre en una pestaña nueva)</span>
                                        </Link>
                                    </div>
                                </>
                            )}
                        </section>
                    )}

                    {/* ---- 7 · DESCRIPCIÓN ---- */}
                    {service && (
                        <section className="cf-booking__block">
                            <BlockHead step={step.notes} title="Algo que debamos saber" note="Opcional" />

                            <div className="cf-dash-field">
                                <textarea
                                    className="cf-dash-input"
                                    rows={3}
                                    value={notes}
                                    maxLength={NOTES_MAX_LENGTH}
                                    onChange={(event) => setNotes(event.target.value)}
                                    placeholder="Portal azul, el timbre no funciona, hay un gato en casa..."
                                    aria-label="Algo que debamos saber"
                                />
                                <p className="cf-dash-field__hint">
                                    {notes.length} / {NOTES_MAX_LENGTH}
                                </p>
                            </div>
                        </section>
                    )}
                </div>

                {/* ---- RESUMEN ---- */}
                <aside className="cf-booking__summary">
                    <h2 className="cf-booking__summary-title">Tu reserva</h2>

                    <div className="cf-booking__rows">
                        <dl className="cf-booking__row">
                            <dt>Servicio</dt>
                            <dd>{service ? service.name : "Sin elegir"}</dd>
                        </dl>
                        {withTasks && (
                            <dl className="cf-booking__row">
                                <dt>Tareas</dt>
                                <dd>
                                    {chosenTasks.length
                                        ? `${chosenTasks.length} ${taskWord(chosenTasks.length)}`
                                        : "Sin elegir"}
                                </dd>
                            </dl>
                        )}
                        <dl className="cf-booking__row">
                            <dt>Quién</dt>
                            <dd>{chosenWorker ? chosenWorker.name : "Cualquiera"}</dd>
                        </dl>
                        <dl className="cf-booking__row cf-booking__row--days">
                            <dt>Cuándo</dt>
                            <dd>
                                {bookedDays.length
                                    ? bookedDays.map((key, index) => (
                                        // Cada día con lo que se trabaja en él: una
                                        // reserva larga son varias jornadas.
                                        <span key={key}>
                                            {`${dayText(key)} · ${start} · ${splitIntoDays(hours)[index]} h`}
                                        </span>
                                    ))
                                    : "Sin elegir"}
                            </dd>
                        </dl>
                        <dl className="cf-booking__row">
                            <dt>Dónde</dt>
                            <dd>
                                {chosenAddress
                                    ? `${chosenAddress.street} ${chosenAddress.number}`
                                    : "Sin elegir"}
                            </dd>
                        </dl>
                    </div>

                    {service && (
                        <div className="cf-booking__total">
                            <span>
                                {hours} h × {formatPrice(service.base_hourly_rate)}/h
                            </span>
                            <strong>{formatPrice(totalPrice(service, hours))}</strong>
                        </div>
                    )}

                    {bookingError && (
                        <p className="cf-dash-alert" role="alert">
                            {bookingError}
                        </p>
                    )}

                    <button type="button" className="cf-dash-btn" disabled={!canBook} onClick={book}>
                        {saving ? "Reservando..." : "Confirmar reserva"}
                    </button>

                    {/* Qué falta para poder reservar, en vez de un botón
                        apagado sin explicación. */}
                    {!canBook && !saving && (
                        <p className="cf-booking__cancel-note">{missing}</p>
                    )}

                    <p className="cf-booking__cancel-note">Puedes cancelar hasta 1 hora antes</p>
                </aside>
            </div>
        </section>
    )
}
