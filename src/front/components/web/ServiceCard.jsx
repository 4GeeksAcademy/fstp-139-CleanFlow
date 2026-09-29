/**
 * Tarjeta reutilizable para mostrar un servicio de CleanFlow.
 *
 * La usan la portada y el bloque "Otros servicios" de la ficha.
 *
 * Lleva dos salidas: contratar, que es a lo que viene el cliente, y ver
 * la ficha, para el que todavía duda. Cuál es la principal lo dice el
 * relleno del botón, no dónde esté colocado.
 *
 * Prioriza la imagen configurada en el backend.
 * Si no existe, utiliza una imagen local de demostración según el servicio.
 */

import { Link } from "react-router-dom";

import {
    getServiceImage,
    servicePlaceholder,
} from "../../data/serviceImages";

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
    const imageSrc = getServiceImage(service);
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

                    {/* Contratar va el último: a la derecha si los dos
                        caben en la fila, y debajo si la tarjeta es
                        estrecha. En los dos casos cierra la lectura. */}
                    <div className="cf-service-card__actions">
                        <Link
                            to={`/services/${service.slug}`}
                            className="cf-btn cf-btn--ghost"
                            aria-label={`Ver más información sobre ${service.name}`}
                        >
                            Ver más información
                        </Link>

                        <Link
                            to={`/dashboard/book?servicio=${service.slug}`}
                            className="cf-btn"
                            aria-label={`Contratar ${service.name}`}
                        >
                            Contratar
                        </Link>
                    </div>
                </div>
            </div>
        </article>
    );
};