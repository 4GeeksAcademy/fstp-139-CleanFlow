/**
 * Sección "Nuestros servicios" de la landing.
 *
 * ⚠️ Contenido pendiente: issue WEB-05. Lee los servicios activos del
 * store y los pinta como tarjetas.
 *
 * Lo único que no se puede cambiar es el id: el navbar y el pie apuntan
 * a él, y si cambia dejan de funcionar sin dar ningún error.
 */

export const ServicesSection = () => {
    return (
        <section
            id="services"
            className="cf-section"
            // PROVISIONAL: quítalo al rellenar la sección (WEB-05).
            style={{ minHeight: "60vh" }}
        >
            <div className="cf-container">
                <h2 className="cf-section__title">Nuestros servicios</h2>
            </div>
        </section>
    )
}