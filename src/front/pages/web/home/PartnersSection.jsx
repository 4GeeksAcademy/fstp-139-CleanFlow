/**
 * Sección "Nuestros partners" de la landing.
 *
 * ⚠️ Contenido pendiente: issue WEB-07. Los logos se declaran en un
 * array del propio archivo: no llevan tabla ni endpoint.
 */

export const PartnersSection = () => {
    return (
        <section
            id="partners"
            className="cf-section"
            // PROVISIONAL: quítalo al rellenar la sección (WEB-07).
            style={{ minHeight: "40vh" }}
        >
            <div className="cf-container">
                <h2 className="cf-section__title">Nuestros partners</h2>
            </div>
        </section>
    )
}