/**
 * Sección de contacto de la landing.
 *
 * ⚠️ Contenido pendiente: issue WEB-09. Los datos de contacto y el
 * formulario para pedir información. No hay página /contact: contacto
 * vive aquí, dentro de la landing.
 *
 * Los datos salen de data/company.js, no se escriben aquí.
 */

export const ContactSection = () => {
    return (
        <section
            id="contact"
            className="cf-section"
            // PROVISIONAL: quítalo al rellenar la sección (WEB-09).
            style={{ minHeight: "50vh" }}
        >
            <div className="cf-container">
                <h2 className="cf-section__title">Contacto</h2>
            </div>
        </section>
    )
}