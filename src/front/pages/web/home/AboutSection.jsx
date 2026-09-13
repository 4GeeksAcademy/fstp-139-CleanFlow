import teamImage from "../../../assets/equipo-cleanflow.png";
const STATS = [
    { value: "5+", label: "Años de experiencia" },
    { value: "500+", label: "Clientes satisfechos" },
    { value: "100%", label: "Compromiso" },
    { value: "24/7", label: "Atención al cliente" },
];

const VALUES = [
    {
        icon: "fa-shield-halved",
        title: "Confianza",
        text: "Profesionales de confianza y verificados.",
    },
    {
        icon: "fa-award",
        title: "Calidad",
        text: "Productos y técnicas de primera.",
    },
    {
        icon: "fa-heart",
        title: "Compromiso",
        text: "Cumplimos lo que prometemos.",
    },
    {
        icon: "fa-handshake",
        title: "Cercanía",
        text: "Trato amable y atención personalizada.",
    },
];

export const AboutSection = () => {
    return (
        <section id="about-us" className="cf-about">
            <div className="cf-container">
                <div className="cf-about__hero">
                    <div className="cf-about__content">
                        <p className="cf-about__eyebrow">
                            Sobre CleanFlow
                        </p>

                        <h2 className="cf-about__title">
                            Cuidado que
                            <span> se nota</span>
                        </h2>

                        <p className="cf-about__text">
                            En CleanFlow nos dedicamos a ofrecer servicios de
                            limpieza de alta calidad para hogares y empresas.
                        </p>

                        <p className="cf-about__text">
                            Nuestro equipo está formado por profesionales
                            capacitados, comprometidos con la excelencia y la
                            satisfacción de nuestros clientes.
                        </p>
                    </div>

                    <div className="cf-about__image">
                        <img
                            src={teamImage}
                            alt="Equipo profesional de CleanFlow"
                        />
                    </div>
                </div>


                <div className="cf-about__stats">
                    {STATS.map((stat) => (
                        <div className="cf-about__stat" key={stat.label}>
                            <strong>{stat.value}</strong>
                            <span>{stat.label}</span>
                        </div>
                    ))}
                </div>

                <div className="cf-about__values">
                    <h3>Nuestros valores</h3>

                    <div className="cf-about__values-grid">
                        {VALUES.map((value) => (
                            <article
                                className="cf-about__value"
                                key={value.title}
                            >
                                <i
                                    className={`fa-solid ${value.icon}`}
                                    aria-hidden="true"
                                ></i>
                                <h4>{value.title}</h4>
                                <p>{value.text}</p>
                            </article>
                        ))}
                    </div>
                </div>

                <div className="cf-about__satisfaction">
                    <div>
                        <h3>
                            Tu satisfacción,
                            <span> nuestra prioridad.</span>
                        </h3>
                        <p>Gracias por confiar en nosotros.</p>
                    </div>

                    <i
                        className="fa-solid fa-seedling"
                        aria-hidden="true"
                    ></i>
                </div>
            </div>
        </section>
    );
};