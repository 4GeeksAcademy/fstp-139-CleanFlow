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

export const EmptyClientHome = ({ firstName, services }) => (
    <div className="cf-client-empty">
        <header className="cf-client-empty__hero">
            <p className="cf-dash-eyebrow">Hola, {firstName}</p>

            <h1>Tu casa cuidada, sin complicaciones</h1>

            <p>
                CleanFlow te conecta con profesionales de confianza para
                mantener tu hogar como quieres. Elige el servicio y nosotros
                organizamos todo lo demás.
            </p>

            <Link to="/dashboard/book" className="cf-dash-btn">
                Contratar mi primer servicio
            </Link>
        </header>

        <section className="cf-client-empty__services">
            <div className="cf-client-empty__heading">
                <p className="cf-dash-eyebrow">Servicios</p>
                <h2>¿Por dónde quieres empezar?</h2>
            </div>

            <div className="cf-client-empty__grid">
                {services.map((service) => (
                    <article
                        className="cf-client-empty__card"
                        key={service.slug}
                    >
                        <img
                            src={
                                service.image_url ||
                                serviceImages[service.slug]
                            }
                            alt=""
                        />

                        <div className="cf-client-empty__body">
                            <h3>{service.name}</h3>
                            <p>{service.description}</p>

                            <span>
                                Desde{" "}
                                {formatPrice(service.base_hourly_rate)}
                                /hora
                            </span>

                            <Link
                                to={`/dashboard/book?servicio=${service.slug}`}
                                aria-label={`Contratar ${service.name}`}
                            >
                                Elegir servicio
                                <i
                                    className="fa-solid fa-arrow-right"
                                    aria-hidden="true"
                                ></i>
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    </div>
);