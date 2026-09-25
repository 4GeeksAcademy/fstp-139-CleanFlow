/**
 * Tarjeta reutilizable para mostrar un servicio de CleanFlow.
 *
 * Recibe los datos desde el componente padre. No hace peticiones a la API:
 * la landing obtiene los servicios desde el store global.
 */

import { Link } from "react-router-dom";
import servicePlaceholder from "../assets/img/service-placeholder.svg";

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
    const imageSrc = service.image_url || servicePlaceholder;

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
                        Desde <strong>{formatPrice(service.base_hourly_rate)}</strong>/h
                    </p>

                    <Link
                        to={`/services/${service.slug}`}
                        className="cf-service-card__link"
                        aria-label={`Ver detalles de ${service.name}`}
                    >
                        Ver servicio
                        <i
                            className="fa-solid fa-arrow-right"
                            aria-hidden="true"
                        ></i>
                    </Link>
                </div>
            </div>
        </article>
    );
};
