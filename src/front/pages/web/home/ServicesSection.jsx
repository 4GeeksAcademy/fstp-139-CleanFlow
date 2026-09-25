/**
 * Sección "Nuestros servicios" de la landing.
 *
 * Lee el catálogo desde el store global. La petición se realiza
 * previamente desde ServicesLoader, por lo que aquí no hacemos fetch.
 */

import { useRef } from "react";
import useGlobalReducer from "../../../hooks/useGlobalReducer.jsx";
import { ServiceCard } from "../../../components/ServiceCard.jsx";

export const ServicesSection = () => {
    const { store } = useGlobalReducer();
    const carouselRef = useRef(null);

    const {
        services = [],
        servicesLoading,
        servicesError,
    } = store;

    const moveCarousel = (direction) => {
        if (!carouselRef.current) return;

        const distance = carouselRef.current.clientWidth * 0.75;

        carouselRef.current.scrollBy({
            left: direction * distance,
            behavior: "smooth",
        });
    };

    return (
        <section id="services" className="cf-section cf-services-section">
            <div className="cf-container">
                <h2 className="cf-section__title">
                    Nuestros servicios
                </h2>

                {servicesLoading && services.length === 0 && (
                    <p className="cf-services-section__message">
                        Cargando servicios...
                    </p>
                )}

                {servicesError && services.length === 0 && (
                    <p className="cf-services-section__message cf-services-section__message--error">
                        No hemos podido cargar los servicios en este momento.
                    </p>
                )}

                {!servicesLoading &&
                    !servicesError &&
                    services.length === 0 && (
                        <p className="cf-services-section__message">
                            Próximamente tendremos nuevos servicios disponibles.
                        </p>
                    )}

                {services.length > 0 && (
                    <>
                        {servicesError && (
                            <p className="cf-services-section__message cf-services-section__message--error">
                                No hemos podido actualizar los servicios. Te mostramos la información disponible.
                            </p>
                        )}

                        <div className="cf-services-carousel">
                            <button
                                className="cf-services-carousel__button"
                                type="button"
                                onClick={() => moveCarousel(-1)}
                                aria-label="Ver servicios anteriores"
                            >
                                <i
                                    className="fa-solid fa-chevron-left"
                                    aria-hidden="true"
                                />
                            </button>

                            <div
                                className="cf-services-carousel__track"
                                ref={carouselRef}
                            >
                                {services.map((service) => (
                                    <ServiceCard
                                        key={service.slug}
                                        service={service}
                                    />
                                ))}
                            </div>

                            <button
                                className="cf-services-carousel__button"
                                type="button"
                                onClick={() => moveCarousel(1)}
                                aria-label="Ver siguientes servicios"
                            >
                                <i
                                    className="fa-solid fa-chevron-right"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};