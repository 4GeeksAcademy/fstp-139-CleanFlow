const REASONS = [
    {
        icon: "fa-user-check",
        title: "Personal propio",
        text: "Nuestro equipo está contratado y verificado por CleanFlow.",
    },
    {
        icon: "fa-spray-can-sparkles",
        title: "Productos incluidos",
        text: "Llevamos los productos necesarios para realizar el servicio.",
    },
    {
        icon: "fa-shield-halved",
        title: "Servicio asegurado",
        text: "Contamos con seguro de responsabilidad civil.",
    },
    {
        icon: "fa-file-circle-check",
        title: "Sin permanencia",
        text: "Contrata nuestros servicios sin compromisos de permanencia.",
    },
    {
        icon: "fa-calendar-check",
        title: "Cancelación flexible",
        text: "Puedes cancelar o modificar tu reserva hasta 24 horas antes.",
    },
]

export const WhyCleanFlowSection = () => {
    return (
        <section id="why-cleanflow" className="cf-section">
            <div className="cf-container">
                <p className="cf-section__label">
                    Ventajas CleanFlow
                </p>

                <h2 className="cf-section__title">
                    ¿Por qué elegir CleanFlow?
                </h2>

                <p className="cf-section__lede">
                    Un servicio sencillo, transparente y adaptado a tus necesidades.
                </p>

                <div className="cf-grid">
                    {REASONS.map((reason) => (
                        <article
                            className="cf-reason-card"
                            key={reason.title}
                        >
                            <div
                                className="cf-reason-card__icon"
                                aria-hidden="true"
                            >
                                <i className={`fa-solid ${reason.icon}`}></i>
                            </div>

                            <h3>{reason.title}</h3>
                            <p>{reason.text}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}