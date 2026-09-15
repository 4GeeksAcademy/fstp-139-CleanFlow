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
 * Sin estilos todavía: se visten en el paso 8 de la #36.
 */

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getServices } from "../../services/serviceService"
import { getTasks } from "../../services/taskService"
import { formatPrice, taskWord } from "../../components/dashboard/ServiceForm"

// Página de contratación de la #14. Es un CONTRATO con ella: lee el servicio
// de ?servicio=<slug>. Mientras la #14 no exista, el enlace acaba en "Not found!".
const BOOKING_PATH = "/dashboard/book"

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
            <section aria-busy="true">
                <h1>Catálogo de servicios</h1>
                <p>Cargando servicios...</p>
            </section>
        )
    }

    if (loadError) {
        return (
            <section>
                <h1>Catálogo de servicios</h1>

                <div role="alert">
                    <p>No se ha podido cargar el catálogo</p>
                    <p>{loadError}</p>
                    <button type="button" onClick={loadCatalog}>
                        Reintentar
                    </button>
                </div>
            </section>
        )
    }

    // Las tareas solo importan si algún servicio las lleva.
    const hasTaskServices = services.some((service) => service.minutes_per_task !== null)

    return (
        <section>
            <h1>Catálogo de servicios</h1>
            <p>Elige el tipo de limpieza que necesitas. El precio es por hora de trabajo.</p>

            {services.length === 0 ? (
                <p>Ahora mismo no hay servicios disponibles. Vuelve a mirarlo más tarde.</p>
            ) : (
                <ul>
                    {services.map((service) => (
                        <li key={service.slug}>
                            <h2>{service.name}</h2>
                            <p>{service.description}</p>
                            <p>{formatPrice(service.base_hourly_rate)} por hora</p>
                            <p>{contractHours(service)}</p>
                            <p>{taskTime(service)}</p>

                            {/* <Link> y no <button>: navega a otra página.
                                aria-label: todos dicen "Contratar", así se sabe cuál es cuál. */}
                            <Link to={`${BOOKING_PATH}?servicio=${service.slug}`} aria-label={`Contratar ${service.name}`}>
                                Contratar
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {/* Una sola vez y no dentro de cada servicio: es la misma lista
                para todos los que llevan tareas. */}
            {hasTaskServices && (
                <>
                    <h2>Tareas disponibles</h2>
                    <p>Valen para todos los servicios con tareas. Cuántas caben en una hora depende de cada servicio.</p>

                    {tasks.length === 0 ? (
                        <p>Ahora mismo no hay tareas disponibles.</p>
                    ) : (
                        <ul>
                            {tasks.map((task) => (
                                <li key={task.task_id}>
                                    <strong>{task.task_name}</strong>
                                    {task.description && <p>{task.description}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </section>
    )
}