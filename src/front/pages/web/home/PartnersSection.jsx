import { useRef } from "react";

import ecoLimpioLogo from "../../../assets/img/ecolimpio.svg";
import higieneProLogo from "../../../assets/img/higienepro.svg";
import verdeCasaLogo from "../../../assets/img/verdecasa.svg";
import brilloPlusLogo from "../../../assets/img/brilloplus.svg";
import purezaLogo from "../../../assets/img/pureza.svg";

const PARTNERS = [
    {
        name: "EcoLimpio",
        logo: ecoLimpioLogo,
    },
    {
        name: "HigienePro",
        logo: higieneProLogo,
    },
    {
        name: "VerdeCasa",
        logo: verdeCasaLogo,
    },
    {
        name: "Brillo+",
        logo: brilloPlusLogo,
    },
    {
        name: "Pureza",
        logo: purezaLogo,
    },
];

export const PartnersSection = () => {
    const carouselRef = useRef(null);

    const moveCarousel = (direction) => {
        if (!carouselRef.current) {
            return;
        }

        const distance = carouselRef.current.clientWidth * 0.75;

        carouselRef.current.scrollBy({
            left: direction * distance,
            behavior: "smooth",
        });
    };

    return (
        <section id="partners" className="cf-partners">
            <div className="cf-container">
                <div className="cf-partners__heading">
                    <p className="cf-partners__eyebrow">
                        Colaboraciones
                    </p>

                    <h2 className="cf-partners__title">
                        Nuestros partners
                    </h2>

                    <p className="cf-partners__description">
                        Trabajamos con marcas que comparten nuestro
                        compromiso con la calidad y el cuidado.
                    </p>
                </div>

                <div className="cf-partners__carousel">
                    <button
                        className="cf-partners__button"
                        type="button"
                        onClick={() => moveCarousel(-1)}
                        aria-label="Ver partners anteriores"
                    >
                        <i
                            className="fa-solid fa-chevron-left"
                            aria-hidden="true"
                        />
                    </button>

                    <div
                        className="cf-partners__track"
                        ref={carouselRef}
                    >
                        {PARTNERS.map((partner) => (
                            <article
                                className="cf-partner-card"
                                key={partner.name}
                            >
                                <img
                                    className="cf-partner-card__logo"
                                    src={partner.logo}
                                    alt={`Logo de ${partner.name}`}
                                />
                            </article>
                        ))}
                    </div>

                    <button
                        className="cf-partners__button"
                        type="button"
                        onClick={() => moveCarousel(1)}
                        aria-label="Ver siguientes partners"
                    >
                        <i
                            className="fa-solid fa-chevron-right"
                            aria-hidden="true"
                        />
                    </button>
                </div>

                <p className="cf-partners__example-label">
                    Marcas colaboradoras de demostración
                </p>
            </div>
        </section>
    );
};