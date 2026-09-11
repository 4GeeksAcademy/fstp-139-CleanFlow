/**
 * Sección "Qué opinan nuestros clientes" de la landing.
 *
 * ⚠️ Contenido pendiente: issue WEB-07. Las opiniones salen de la base
 * de datos de CleanFlow, nunca de Google ni de fuentes externas.
 */

export const ReviewsSection = () => {
    return (
        <section
            id="reviews"
            className="cf-section"
            // PROVISIONAL: quítalo al rellenar la sección (WEB-07).
            style={{ minHeight: "60vh" }}
        >
            <div className="cf-container">
                <h2 className="cf-section__title">Qué opinan nuestros clientes</h2>
            </div>
        </section>
    )
}