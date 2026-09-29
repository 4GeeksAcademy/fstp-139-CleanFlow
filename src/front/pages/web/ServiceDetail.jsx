import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getServiceBySlug, getServices } from "../../services/serviceService";
import { getTasks } from "../../services/taskService";
import { ServiceCard } from "../../components/web/ServiceCard";
import { getServiceImage } from "../../data/serviceImages";

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

    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState("");
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
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

    return (
        <main className="cf-service-detail">
            <section className="cf-service-detail__hero">
                <div className="cf-service-detail__image-wrap">
                    <img
                        src={imageSrc}
                        alt={service.name}
                        className="cf-service-detail__image"
                    />
                </div>

                <div className="cf-service-detail__content">
                    <p className="cf-service-detail__eyebrow">
                        Servicio de limpieza
                    </p>

                    <h1 className="cf-service-detail__title">
                        {service.name}
                    </h1>

                    <p className="cf-service-detail__description">
                        {service.long_description ||
                            service.description ||
                            "Consulta todos los detalles de este servicio de limpieza."}
                    </p>

                    <div className="cf-service-detail__facts">
                        <div className="cf-service-detail__fact">
                            <span>Precio</span>
                            <strong>
                                {formatPrice(service.base_hourly_rate)} / hora
                            </strong>
                        </div>

                        <div className="cf-service-detail__fact">
                            <span>Mínimo</span>
                            <strong>
                                {service.min_hours}{" "}
                                {service.min_hours === 1 ? "hora" : "horas"}
                            </strong>
                        </div>

                        <div className="cf-service-detail__fact">
                            <span>Máximo</span>
                            <strong>
                                {service.max_hours
                                    ? `${service.max_hours} horas`
                                    : "Consultar disponibilidad"}
                            </strong>
                        </div>

                        <div className="cf-service-detail__fact">
                            <span>
                                {service.minutes_per_task !== null
                                    ? "En una hora caben"
                                    : "Contratación"}
                            </span>

                            <strong>
                                {service.minutes_per_task !== null
                                    ? `${Math.floor(60 / service.minutes_per_task)} tareas`
                                    : `Bloques de ${service.hour_step} horas`}
                            </strong>
                        </div>
                    </div>

                    <p className="cf-service-detail__availability">
                        Las horas disponibles dependen de la agenda del trabajador y del
                        horario que elijas.
                    </p>

                    <Link
                        to={contractPath}
                        className="cf-btn cf-service-detail__cta"
                    >
                        Contratar este servicio
                    </Link>
                </div>
            </section>

            <section className="cf-service-detail__tasks">
                {service.minutes_per_task !== null ? (
                    <>
                        <h2>Tareas que puedes añadir</h2>

                        <p className="cf-service-detail__tasks-intro">
                            Puedes seleccionar estas tareas al contratar el servicio.
                            Cada una dispone de aproximadamente{" "}
                            {service.minutes_per_task} minutos dentro del tiempo contratado.
                        </p>

                        {tasks.length > 0 ? (
                            <ul className="cf-service-detail__task-list">
                                {tasks.map((task) => (
                                    <li
                                        key={task.task_id}
                                        className="cf-service-detail__task"
                                    >
                                        <i
                                            className="fa-solid fa-check"
                                            aria-hidden="true"
                                        />

                                        <div>
                                            <strong>{task.task_name}</strong>

                                            {task.description && (
                                                <p>{task.description}</p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>
                                Consulta las tareas disponibles al contratar el servicio.
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <h2>Cómo se contrata este servicio</h2>

                        <p className="cf-service-detail__tasks-intro">
                            Este servicio no se organiza por tareas individuales. Se
                            contrata en bloques de {service.hour_step} horas, desde un
                            mínimo de {service.min_hours} hasta un máximo de{" "}
                            {service.max_hours} horas.
                        </p>
                    </>
                )}
            </section>

            {otherServices.length > 0 && (
                <section className="cf-service-detail__others">
                    <div className="cf-service-detail__others-heading">
                        <p className="cf-service-detail__eyebrow">
                            También te puede interesar
                        </p>

                        <h2>Otros servicios</h2>
                    </div>

                    <div className="cf-service-detail__others-grid">
                        {otherServices.map((item) => (
                            <ServiceCard
                                key={item.slug}
                                service={item}
                            />
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
};