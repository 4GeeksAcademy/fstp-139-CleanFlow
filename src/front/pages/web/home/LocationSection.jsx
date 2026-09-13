/**
 * Sección "Dónde estamos" de la landing.
 *
 * ⚠️ Contenido pendiente: issue WEB-07. Mapa de Google incrustado, en un
 * componente reutilizable, porque la página de contacto (WEB-09) usa el
 * mismo.
 *
 * La dirección y el horario salen de data/company.js, no se escriben
 * aquí.
 */

export const LocationSection = () => {
    return (
        <section
            id="location"
            className="cf-section"
            // PROVISIONAL: quítalo al rellenar la sección (WEB-07).
            style={{ minHeight: "50vh" }}
        >
            <div className="cf-container">
                <h2 className="cf-section__title">Dónde estamos</h2>
            </div>
        </section>
    )
}