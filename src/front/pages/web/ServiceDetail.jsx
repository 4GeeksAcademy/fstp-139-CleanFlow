/**
 * LA FICHA PÚBLICA DE UN SERVICIO (/services/:slug).
 *
 * A dónde llega quien ve un servicio en la portada y quiere saber más
 * antes de contratarlo. No pide sesión: es parte de la web pública.
 *
 * La misma plantilla sirve para las dos formas de contratar. Los
 * servicios con tareas enseñan la lista y cuántas caben en una hora; los
 * que van por tiempo —fin de obra— explican los bloques y no enseñan
 * ninguna lista. Lo decide `porTareas`.
 *
 * Las tareas que se ven son las del catálogo, no las de este servicio:
 * el backend todavía no las relaciona. Por eso el bloque dice lo que se
 * puede AÑADIR y no lo que el servicio incluye.
 *
 * Estilos: web.css, bloque cf-service-detail.
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getServiceBySlug, getServices } from "../../services/serviceService";
import { getTasks } from "../../services/taskService";
import { ServiceCard } from "../../components/web/ServiceCard";
import { getServiceImage } from "../../data/serviceImages";

/** "1 hora" / "8 horas". El singular se cuela si no se mira. */
const horasTexto = (horas) => `${horas} ${horas === 1 ? "hora" : "horas"}`;

const formatPrice = (price) => {
    const value = Number(price);

    if (!Number.isFinite(value)) return "—";

    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(value);
};


export const ServiceDetail = () => {
    const { slug } = useParams();

    const [service, setService] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [otherServices, setOtherServices] = useState([]);

    // Tres finales distintos y no uno solo: "no existe" se cuenta de otra
    // manera que "no hemos podido cargarlo", y solo el segundo se puede
    // reintentar. retryKey es el que vuelve a lanzar el efecto.
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState("");
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        // Cambiar de servicio deja la petición anterior en el aire. Sin
        // esto, la que tarde más pinta la última y se ve una ficha que no
        // es la de la dirección.
        let cancelled = false;

        const loadServiceDetail = async () => {
            setLoading(true);
            setNotFound(false);
            setError("");
            setService(null);

            const serviceResult = await getServiceBySlug(slug);

            if (cancelled) return;

            if (!serviceResult.ok) {
                if (serviceResult.status === 404) {
                    setNotFound(true);
                } else {
                    setError(
                        serviceResult.data?.message ||
                        "No se ha podido cargar el servicio. Inténtalo de nuevo."
                    );
                }

                setLoading(false);
                return;
            }

            const currentService = serviceResult.data;

            setService(currentService);

            const requests = [getServices()];

            if (currentService.minutes_per_task !== null) {
                requests.push(getTasks());
            }

            const [servicesResult, tasksResult] = await Promise.all(requests);

            if (cancelled) return;

            // Los otros dos bloques son de adorno: si fallan, la ficha se
            // pinta igual sin ellos. Solo el servicio en sí es motivo
            // para enseñar un error.
            if (servicesResult.ok) {
                setOtherServices(
                    servicesResult.data.filter(
                        (item) => item.slug !== currentService.slug
                    )
                );
            } else {
                setOtherServices([]);
            }

            if (currentService.minutes_per_task !== null && tasksResult?.ok) {
                setTasks(tasksResult.data);
            } else {
                setTasks([]);
            }

            setLoading(false);
        };

        loadServiceDetail();

        return () => {
            cancelled = true;
        };
    }, [slug, retryKey]);

    if (loading) {
        return (
            <main className="cf-service-detail" aria-busy="true">
                <p className="cf-service-detail__status">Cargando servicio...</p>
            </main>
        );
    }

    if (notFound) {
        return (
            <main className="cf-service-detail">
                <section className="cf-service-detail__state">
                    <h1>Servicio no disponible</h1>
                    <p>
                        El servicio que buscas no existe o ya no se encuentra disponible.
                    </p>

                    <Link to="/#servicios" className="cf-btn">
                        Volver al catálogo
                    </Link>
                </section>
            </main>
        );
    }

    if (error) {
        return (
            <main className="cf-service-detail">
                <section
                    className="cf-service-detail__state"
                    role="alert"
                >
                    <h1>No hemos podido cargar el servicio</h1>
                    <p>{error}</p>

                    <button
                        type="button"
                        className="cf-btn"
                        onClick={() => setRetryKey((value) => value + 1)}
                    >
                        Reintentar
                    </button>
                </section>
            </main>
        );
    }

    if (!service) return null;

    const imageSrc = getServiceImage(service);

    // Siempre a contratar, haya sesión o no. Si no la hay, ProtectedRoutes
    // lo intercepta, lo manda al login que le toca y guarda esta misma
    // dirección para devolverlo después con el servicio ya elegido.
    //
    // La ficha no pregunta por la sesión a propósito: hacerlo aquí era lo
    // que mandaba al registro y perdía el servicio por el camino.
    const contractPath = `/dashboard/book?servicio=${service.slug}`;

    // Sin minutos por tarea el servicio va por tiempo, como fin de obra.
    // Es lo que decide casi todo lo que cambia en esta pantalla.
    const porTareas = service.minutes_per_task !== null;

    const tareasPorHora = porTareas
        ? Math.floor(60 / service.minutes_per_task)
        : 0;

    // Los tres pasos: los mismos hitos, contados según cómo se contrate.
    // Sin esto, a un servicio por jornadas se le hablaría de tareas.
    const pasos = porTareas
        ? [
            ["Eliges las tareas", "De la lista de abajo, las que necesites. Ninguna es obligatoria."],
            ["Eliges día y hora", "Ves la agenda real del equipo y los huecos que quedan libres."],
            ["Vamos a tu casa", "Te decimos quién va, y al terminar ves las fotos de cómo quedó."],
        ]
        : [
            ["Eliges cuántas horas", `Desde ${service.min_hours} y en bloques de ${service.hour_step}.`],
            ["Eliges cuándo empezar", "Si son varias jornadas, se reparten en días seguidos con la misma persona."],
            ["Vamos a tu casa", "Te decimos quién va, y al terminar ves las fotos de cómo quedó."],
        ];

    return (
        <main className="cf-service-detail">
            {/* ---------- LA PORTADA ---------- */}
            <div className="cf-service-detail__w">
                <Link to="/#services" className="cf-service-detail__back">
                    <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                    Todos los servicios
                </Link>

                <div className="cf-service-detail__rule" />

                <p className="cf-service-detail__eyebrow">Servicio de limpieza</p>

                <h1 className="cf-service-detail__title">{service.name}</h1>

                <p className="cf-service-detail__lede">
                    {service.long_description ||
                        service.description ||
                        "Consulta todos los detalles de este servicio de limpieza."}
                </p>

                {/* ---------- FOTO Y COMPRA ---------- */}
                <div className="cf-service-detail__main">
                    <div className="cf-service-detail__shot">
                        <img src={imageSrc} alt={service.name} />
                    </div>

                    <div className="cf-service-detail__buy">
                        <p className="cf-service-detail__price">
                            {formatPrice(service.base_hourly_rate)}
                            <small>por hora</small>
                        </p>

                        <div className="cf-service-detail__facts">
                            <div className="cf-service-detail__fact">
                                <span>Mínimo</span>
                                <strong>{horasTexto(service.min_hours)}</strong>
                            </div>

                            <div className="cf-service-detail__fact">
                                <span>Máximo</span>
                                <strong>
                                    {service.max_hours
                                        ? horasTexto(service.max_hours)
                                        : "Sin tope"}
                                </strong>
                            </div>

                            <div className="cf-service-detail__fact">
                                <span>
                                    {porTareas ? "En una hora caben" : "Se contrata en"}
                                </span>
                                <strong>
                                    {porTareas
                                        ? `${tareasPorHora} ${tareasPorHora === 1 ? "tarea" : "tareas"}`
                                        : `bloques de ${service.hour_step} h`}
                                </strong>
                            </div>
                        </div>

                        <Link to={contractPath} className="cf-btn cf-service-detail__cta">
                            Contratar este servicio
                        </Link>

                        <p className="cf-service-detail__after">
                            {porTareas
                                ? "Eliges el día, la hora y las tareas en el siguiente paso."
                                : "Eliges cuántas horas y qué días en el siguiente paso."}
                        </p>

                        <p className="cf-service-detail__avail">
                            <i className="fa-solid fa-circle-info" aria-hidden="true" />
                            <span>
                                <strong>Siempre según disponibilidad.</strong> Las horas que
                                puedes contratar dependen de la agenda del equipo. Al elegir
                                día y hora verás cuántas quedan libres.
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* ---------- LA BANDA OSCURA ----------
                A sangre, fuera del ancho de lectura: es lo que parte la
                página por la mitad y evita que se lea del tirón. */}
            <section className="cf-service-detail__how">
                <div className="cf-service-detail__w">
                    <h2>
                        {porTareas
                            ? "Contratarlo lleva tres pasos"
                            : "Se contrata por tiempo, no por tareas"}
                    </h2>

                    <div className="cf-service-detail__steps">
                        {pasos.map(([titulo, texto], indice) => (
                            <div className="cf-service-detail__step" key={titulo}>
                                <span className="cf-service-detail__step-n">
                                    {indice + 1}
                                </span>
                                <h3>{titulo}</h3>
                                <p>{texto}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------- LAS TAREAS ----------
                Son las del catálogo, no las de este servicio: el backend
                todavía no las relaciona. Por eso el título dice lo que se
                puede añadir y no lo que incluye. */}
            {porTareas && tasks.length > 0 && (
                <section className="cf-service-detail__block">
                    <div className="cf-service-detail__w">
                        <h2 className="cf-service-detail__h2">Tareas que puedes añadir</h2>

                        <p className="cf-service-detail__sub">
                            Eliges las que necesites al contratar. Cada una ocupa unos{" "}
                            {service.minutes_per_task} minutos del tiempo que contrates.
                        </p>

                        <ul className="cf-service-detail__tasks">
                            {tasks.map((task) => (
                                <li className="cf-service-detail__task" key={task.task_id}>
                                    <i className="fa-solid fa-check" aria-hidden="true" />
                                    <div>
                                        <strong>{task.task_name}</strong>
                                        {task.description && <p>{task.description}</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {/* ---------- EL CIERRE ---------- */}
            <section className="cf-service-detail__end">
                <div className="cf-service-detail__w">
                    <h2>¿Lo dejamos listo esta semana?</h2>
                    <Link to={contractPath} className="cf-btn">
                        Contratar este servicio
                    </Link>
                </div>
            </section>

            {otherServices.length > 0 && (
                <section className="cf-service-detail__others">
                    <div className="cf-service-detail__w">
                        <p className="cf-service-detail__eyebrow">
                            También te puede interesar
                        </p>

                        <h2 className="cf-service-detail__h2">Otros servicios</h2>

                        <div className="cf-service-detail__others-grid">
                            {otherServices.map((item) => (
                                <ServiceCard key={item.slug} service={item} />
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
};