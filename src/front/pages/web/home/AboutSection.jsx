/**
 * Sección "Sobre nosotros" de la landing.
 *
 * ⚠️ Contenido pendiente: issue WEB-06. Presentación de la empresa,
 * puntos fuertes y razones para contratar.
 *
 * Es la sección a la que apunta "Sobre CleanFlow" en el navbar: no
 * cambies el id.
 */

export const AboutSection = () => {
    return (
        <section
            id="about-us"
            className="cf-section"
            // PROVISIONAL: quítalo al rellenar la sección (WEB-06).
            style={{ minHeight: "60vh" }}
        >
            <div className="cf-container">
                <h2 className="cf-section__title">Sobre nosotros</h2>
            </div>
        </section>
    )
}