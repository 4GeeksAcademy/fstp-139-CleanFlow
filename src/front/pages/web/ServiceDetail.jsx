import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import useGlobalReducer from "../../hooks/useGlobalReducer";
import { getServiceBySlug, getServices } from "../../services/serviceService";
import { getTasks } from "../../services/taskService";
import { ServiceCard } from "../../components/web/ServiceCard";
import servicePlaceholder from "../../assets/img/service-placeholder.svg";
import limpiezaEsencial from "../../assets/img/services/limpieza-esencial.webp";
import limpiezaIntegral from "../../assets/img/services/limpieza-integral.webp";
import limpiezaProfunda from "../../assets/img/services/limpieza-profunda.webp";
import limpiezaFinDeObra from "../../assets/img/services/limpieza-fin-de-obra.webp";
const serviceImages = {
    "limpieza-esencial": limpiezaEsencial,
    "limpieza-integral": limpiezaIntegral,
    "limpieza-profunda": limpiezaProfunda,
    "limpieza-fin-de-obra": limpiezaFinDeObra,
};

const formatPrice = (price) => {
    const value = Number(price);

    if (!Number.isFinite(value)) return "—";

    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(value);
};

const formatDuration = (service) => {
    if (!service) return "";

    const minHours = service.min_hours;
    const maxHours = service.max_hours;

    if (maxHours !== null && maxHours !== undefined) {
        return `${minHours}–${maxHours} horas`;
    }

    return `Desde ${minHours} ${minHours === 1 ? "hora" : "horas"}`;
};

export const ServiceDetail = () => {
    const { slug } = useParams();
    const { store } = useGlobalReducer();

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

    const imageSrc =
        service.image_url ||
        serviceImages[service.slug] ||
        servicePlaceholder;

    const contractPath = store.token
        ? `/dashboard/book?servicio=${service.slug}`
        : "/register";

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
                            <span>Duración</span>
                            <strong>{formatDuration(service)}</strong>
                        </div>
                    </div>

                    <Link
                        to={contractPath}
                        className="cf-btn cf-service-detail__cta"
                    >
                        Contratar este servicio
                    </Link>
                </div>
            </section>

            {service.minutes_per_task !== null && (
                <section className="cf-service-detail__tasks">
                    <h2>Qué incluye este servicio</h2>

                    <p className="cf-service-detail__tasks-intro">
                        Cada tarea dispone de aproximadamente{" "}
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
                </section>
            )}

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