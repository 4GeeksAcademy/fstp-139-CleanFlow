/**
 * Tarjeta reutilizable para mostrar un servicio de CleanFlow.
 *
 * Prioriza la imagen configurada en el backend.
 * Si no existe, utiliza una imagen local de demostración según el servicio.
 */

import { Link } from "react-router-dom";

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
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export const ServiceCard = ({ service }) => {
    const imageSrc =
        service.image_url ||
        serviceImages[service.slug] ||
        servicePlaceholder;

    return (
        <article className="cf-service-card">
            <img
                className="cf-service-card__image"
                src={imageSrc}
                alt=""
                onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = servicePlaceholder;
                }}
            />

            <div className="cf-service-card__body">
                <h3 className="cf-service-card__title">
                    {service.name}
                </h3>

                <p className="cf-service-card__description">
                    {service.description}
                </p>

                <div className="cf-service-card__footer">
                    <p className="cf-service-card__price">
                        Desde{" "}
                        <strong>
                            {formatPrice(service.base_hourly_rate)}
                        </strong>
                        /h
                    </p>

                    <Link
                        to={`/dashboard/book?servicio=${service.slug}`}
                        className="cf-btn"
                        aria-label={`Contratar ${service.name}`}
                    >
                        Contratar
                    </Link>
                </div>
            </div>
        </article>
    );
};