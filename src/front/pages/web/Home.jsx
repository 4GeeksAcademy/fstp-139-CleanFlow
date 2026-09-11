/**
 * LANDING.
 *
 * ⚠️ ANDAMIO PROVISIONAL — LO SUSTITUYE LA ISSUE WEB-04.
 *
 * Seis huecos vacíos que existen por un motivo: dar destino a las anclas
 * del navbar mientras las secciones reales no están hechas.
 *
 * Lo único intocable son los seis `id`: el navbar y el pie apuntan a
 * ellos. Cambiar uno rompe esos enlaces sin dar ningún error.
 */
import { AboutSection } from "./home/AboutSection"

// El orden del array es el orden en pantalla: reordenar la landing es
// mover una línea.
const SECTIONS = [
    { id: "hero", titulo: "Hero", },
    { id: "services", titulo: "Nuestros servicios", },
    { id: "about-us", titulo: "Sobre nosotros", },
    { id: "reviews", titulo: "Qué opinan nuestros clientes", },
    { id: "partners", titulo: "Nuestros partners", },
    { id: "location", titulo: "Dónde estamos", },
]

// ---- CÓMO SE AÑADE UNA SECCIÓN ----
//
// Hoy las seis están aquí porque esto es un andamio. Cuando WEB-04 lo
// sustituya, cada una será un componente en pages/web/home/ y este
// archivo solo las importará y ordenará:
//
//     export const Home = () => (
//         <main>
//             <Hero />
//             <ServicesSection />
//         </main>
//     )
//
// El contrato: cada componente devuelve SU PROPIA <section id="...">.
// No la envuelve Home. Así el id vive junto a su contenido y nadie tiene
// que tocar este archivo para rellenar el suyo.
//
// Para añadir una sección: créala, impórtala arriba y colócala en su
// sitio. Si además debe aparecer en el menú, añade su id a NAV_LINKS
// en components/web/Navbar.jsx.

export const Home = () => {
    return (
        <main>
            {SECTIONS.map((section) =>
                section.id === "about-us" ? (
                    <AboutSection key={section.id} />
                ) : (
                    <section
                        key={section.id}
                        id={section.id}
                        style={{
                            minHeight: "80vh",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            borderBottom: "1px dashed #bbb",
                            padding: "40px 20px",
                            textAlign: "center",
                        }}
                    >
                        <h2>{section.titulo}</h2>
                        <p style={{ color: "#777", margin: 0 }}>
                            Sección provisional · <code>{section.id}</code>
                        </p>
                    </section>
                )
            )}
        </main>
    )
}
