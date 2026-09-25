/**
 * Sección "Nuestros servicios" de la landing.
 *
 * Lee el catálogo desde el store global. La petición se realiza
 * previamente desde ServicesLoader, por lo que aquí no hacemos fetch.
 */

import useGlobalReducer from "../../../hooks/useGlobalReducer.jsx";
import { ServiceCard } from "../../../components/ServiceCard.jsx";

export const ServicesSection = () => {
    const { store } = useGlobalReducer();

    const {
        services = [],
        servicesLoading,
        servicesError,
    } = store;

    return (
        <section id="services" className="cf-section cf-services-section">
            <div className="cf-container">
                <h2 className="cf-section__title">Nuestros servicios</h2>

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

                        <div className="cf-services-grid">
                            {services.map((service) => (
                                <ServiceCard
                                    key={service.slug}
                                    service={service}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};
