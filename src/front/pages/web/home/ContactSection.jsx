/**
 * Sección de contacto de la landing.
 *
 * ⚠️ Contenido pendiente. Es un resumen, no la página entera: los datos
 * de contacto y un enlace a /contact, donde está el formulario (WEB-09).
 *
 * Los datos salen de data/company.js, no se escriben aquí.
 */

export const ContactSection = () => {
    return (
        <section
            id="contact"
            className="cf-section"
            // PROVISIONAL: quítalo al rellenar la sección.
            style={{ minHeight: "50vh" }}
        >
            <div className="cf-container">
                <h2 className="cf-section__title">Contacto</h2>
            </div>
        </section>
    )
}