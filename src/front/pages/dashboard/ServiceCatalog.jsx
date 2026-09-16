/**
 * CATÁLOGO DE SERVICIOS (CLIENTE).
 *
 * Lo que se puede contratar ahora mismo: los servicios activos y, una sola
 * vez, las tareas del catálogo compartido. Solo lectura: crear y editar es
 * del encargado (ManageServices.jsx).
 *
 * La URL /dashboard/service-catalog es un CONTRATO: el botón "Reservar ahora"
 * de la web (WEB-15) apunta aquí. Si cambia, hay que avisar.
 *
 * "Contratar" lleva a la página de la #14, que calcula horas y precio.
 *
 * API: getServices y getTasks, las mismas que usa la web pública.
 * Estilos: dashboard.css (cf-dash-*, cf-catalog__*).
 */

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getServices } from "../../services/serviceService"
import { getTasks } from "../../services/taskService"
import { formatPrice, taskWord } from "../../components/dashboard/ServiceForm"
import "../../dashboard.css"

// Página de contratación de la #14. Es un CONTRATO con ella: lee el servicio
// de ?servicio=<slug>. Mientras la #14 no exista, el enlace acaba en "Not found!".
const BOOKING_PATH = "/dashboard/book"

// Tarjetas grises que se ven mientras carga.
const SKELETON_CARDS = 4

// ----------------------------------------------------------------------
// TEXTOS DEL TIEMPO
// ----------------------------------------------------------------------

const hourWord = (count) => (count === 1 ? "hora" : "horas")

/** "Desde 1 hora" · "Desde 6 horas, ampliable de 3 en 3" · "…, hasta 12 horas" */
const contractHours = (service) => {
    let text = `Desde ${service.min_hours} ${hourWord(service.min_hours)}`

    if (service.hour_step > 1) text += `, ampliable de ${service.hour_step} en ${service.hour_step}`
    if (service.max_hours !== null) text += `, hasta ${service.max_hours} horas`

    return text
}

/** Cómo se reparte cada hora. minutes_per_task null = el servicio no lleva tareas. */
const taskTime = (service) =>
    service.minutes_per_task === null
        ? "Sin tareas: se contrata solo por horas."
        : `Cada tarea son ${service.minutes_per_task} minutos: ${service.tasks_per_hour} ${taskWord(service.tasks_per_hour)} por hora.`

// Título y entradilla. También salen mientras carga y con error.
const PageHeader = () => (
    <div className="cf-catalog__header">
        <h1 className="cf-catalog__title">Catálogo de servicios</h1>
        <p className="cf-catalog__lede">
            Elige el tipo de limpieza que necesitas. El precio es por hora de trabajo.
        </p>
    </div>
)

// ----------------------------------------------------------------------
// COMPONENTE
// ----------------------------------------------------------------------

export const ServiceCatalog = () => {
    const [services, setServices] = useState([])
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")

    const loadCatalog = async () => {
        setLoading(true)
        setLoadError("")

        // Las dos peticiones a la vez: ninguna necesita a la otra.
        // Promise.all no falla nunca aquí, porque estas funciones no lanzan.
        const [servicesResult, tasksResult] = await Promise.all([getServices(), getTasks()])

        if (servicesResult.ok && tasksResult.ok) {
            setServices(servicesResult.data)
            setTasks(tasksResult.data)
        } else {
            // Un solo mensaje: si fallan las dos, es por lo mismo.
            setLoadError((servicesResult.ok ? tasksResult : servicesResult).data.message)
        }

        setLoading(false)
    }

    useEffect(() => {
        loadCatalog()
    }, [])

    if (loading) {
        return (
            <section className="cf-catalog" aria-busy="true">
                <PageHeader />

                {/* Las barras grises no dicen nada a un lector de pantalla:
                    este texto sí, y no se ve. */}
                <p className="sr-only">Cargando servicios...</p>

                <ul className="cf-catalog__grid" aria-hidden="true">
                    {Array.from({ length: SKELETON_CARDS }, (_, index) => (
                        <li className="cf-catalog__card" key={index}>
                            <span className="cf-dash-skel cf-catalog__skel-name" />
                            <span className="cf-dash-skel cf-catalog__skel-line" />
                            <span className="cf-dash-skel cf-catalog__skel-price" />
                            <span className="cf-dash-skel cf-catalog__skel-line" />
                            <span className="cf-dash-skel cf-catalog__skel-btn" />
                        </li>
                    ))}
                </ul>
            </section>
        )
    }

    if (loadError) {
        return (
            <section className="cf-catalog">
                <PageHeader />

                <div className="cf-dash-state cf-dash-state--error" role="alert">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">No se ha podido cargar el catálogo</p>
                    <p className="cf-dash-state__text">{loadError}</p>
                    <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={loadCatalog}>
                        Reintentar
                    </button>
                </div>
            </section>
        )
    }

    // Las tareas solo importan si algún servicio las lleva.
    const hasTaskServices = services.some((service) => service.minutes_per_task !== null)

    return (
        <section className="cf-catalog">
            <PageHeader />

            {services.length === 0 ? (
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-broom" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">Ahora mismo no hay servicios disponibles</p>
                    <p className="cf-dash-state__text">Vuelve a mirarlo más tarde.</p>
                </div>
            ) : (
                <ul className="cf-catalog__grid">
                    {services.map((service) => {
                        const noTasks = service.minutes_per_task === null

                        return (
                            <li className="cf-catalog__card" key={service.slug}>
                                <div className="cf-catalog__top">
                                    <div>
                                        <h2 className="cf-catalog__name">{service.name}</h2>
                                        <p className="cf-catalog__desc">{service.description}</p>
                                    </div>

                                    {/* La etiqueta distingue de un vistazo el servicio sin tareas. */}
                                    <span className={"cf-catalog__kind" + (noTasks ? " cf-catalog__kind--hours" : "")}>
                                        {noTasks ? "Solo horas" : "Por tareas"}
                                    </span>
                                </div>

                                <p className="cf-catalog__price">
                                    <strong>{formatPrice(service.base_hourly_rate)}</strong>
                                    <span>por hora</span>
                                </p>

                                <ul className="cf-catalog__facts">
                                    <li>
                                        <i className="fa-solid fa-clock" aria-hidden="true" />
                                        <span>{contractHours(service)}</span>
                                    </li>
                                    <li>
                                        <i className="fa-solid fa-list-check" aria-hidden="true" />
                                        <span>{taskTime(service)}</span>
                                    </li>
                                </ul>

                                {/* <Link> y no <button>: navega a otra página.
                                    aria-label: todos dicen "Contratar", así se sabe cuál es cuál. */}
                                <Link
                                    to={`${BOOKING_PATH}?servicio=${service.slug}`}
                                    className="cf-dash-btn cf-catalog__cta"
                                    aria-label={`Contratar ${service.name}`}
                                >
                                    Contratar
                                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}

            {/* Una sola vez y no dentro de cada servicio: es la misma lista
                para todos los que llevan tareas. */}
            {hasTaskServices && (
                <div className="cf-catalog__section">
                    <h2 className="cf-catalog__subtitle">Tareas disponibles</h2>
                    <p className="cf-catalog__lede">
                        Valen para todos los servicios con tareas. Cuántas caben en una hora depende de cada servicio.
                    </p>

                    {tasks.length === 0 ? (
                        <p className="cf-catalog__lede">Ahora mismo no hay tareas disponibles.</p>
                    ) : (
                        <ul className="cf-catalog__tasks">
                            {tasks.map((task) => (
                                <li className="cf-catalog__task" key={task.task_id}>
                                    <span className="cf-catalog__task-icon">
                                        <i className="fa-solid fa-check" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <p className="cf-catalog__task-name">{task.task_name}</p>
                                        {task.description && <p className="cf-catalog__task-desc">{task.description}</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </section>
    )
}
