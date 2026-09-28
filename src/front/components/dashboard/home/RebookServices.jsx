import { Link } from "react-router-dom";

import limpiezaEsencial from "../../../assets/img/services/limpieza-esencial.webp";
import limpiezaIntegral from "../../../assets/img/services/limpieza-integral.webp";
import limpiezaProfunda from "../../../assets/img/services/limpieza-profunda.webp";
import limpiezaFinDeObra from "../../../assets/img/services/limpieza-fin-de-obra.webp";

const serviceImages = {
    "limpieza-esencial": limpiezaEsencial,
    "limpieza-integral": limpiezaIntegral,
    "limpieza-profunda": limpiezaProfunda,
    "limpieza-fin-de-obra": limpiezaFinDeObra,
};

const formatPrice = (price) =>
    new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(Number(price));

export const RebookServices = ({ bookings, services }) => {
    const contracted = bookings
        .filter((booking) => booking.status !== "cancelled")
        .reduce((summary, booking) => {
            const slug = booking.service?.slug;

            if (!slug) return summary;

            if (!summary[slug]) {
                summary[slug] = {
                    service: booking.service,
                    times: 0,
                };
            }

            summary[slug].times += 1;
            return summary;
        }, {});

    const repeatedServices = Object.values(contracted);

    if (repeatedServices.length === 0) return null;

    return (
        <section className="cf-client-rebook">
            <div className="cf-client-rebook__header">
                <div>
                    <p className="cf-dash-eyebrow">Tus favoritos</p>
                    <h2>Volver a contratar</h2>
                </div>

                <Link
                    to="/dashboard/service-catalog"
                    className="cf-client-rebook__catalog"
                >
                    Ver todos los servicios
                </Link>
            </div>

            <div className="cf-client-rebook__grid">
                {repeatedServices.map(({ service, times }) => {
                    const catalogService = services.find(
                        (item) => item.slug === service.slug
                    );

                    return (
                        <article
                            className="cf-client-rebook__card"
                            key={service.slug}
                        >
                            <img
                                src={
                                    catalogService?.image_url ||
                                    serviceImages[service.slug]
                                }
                                alt=""
                            />

                            <div className="cf-client-rebook__body">
                                <p className="cf-client-rebook__times">
                                    Lo has pedido {times}{" "}
                                    {times === 1 ? "vez" : "veces"}
                                </p>

                                <h3>{service.name}</h3>

                                {catalogService?.base_hourly_rate && (
                                    <p className="cf-client-rebook__price">
                                        Desde{" "}
                                        {formatPrice(
                                            catalogService.base_hourly_rate
                                        )}
                                        /hora
                                    </p>
                                )}

                                <Link
                                    to={`/dashboard/book?servicio=${service.slug}`}
                                    className="cf-dash-btn"
                                >
                                    Repetir servicio
                                </Link>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
};