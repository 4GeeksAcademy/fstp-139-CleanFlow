/**
 * Página de inicio (landing).
 *
 * ⚠️ ANDAMIO PROVISIONAL — LO SUSTITUYE LA ISSUE WEB-04
 *
 * Secciones vacías temporales para que el navbar pueda probar la 
 * navegación por anclas.
 *
 * Lo ÚNICO que no se puede cambiar de aquí son los seis `id`: el navbar y
 * el footer apuntan a ellos. El resto es diseño temporal.
 *
 * Cada sección se convertirá en su propio componente dentro de
 * pages/web/home/, uno por issue, para que varias personas puedan
 * trabajar a la vez sin tocar el mismo archivo:
 */

// Se usa un array para definir el orden de las secciones en el scroll,
// ver de un vistazo las anclas disponibles.

const SECTIONS = [
    { id: "hero",      titulo: "Hero",                         },
    { id: "services",  titulo: "Nuestros servicios",           },
    { id: "about-us",  titulo: "Sobre nosotros",               },
    { id: "reviews",   titulo: "Qué opinan nuestros clientes", },
    { id: "partners",  titulo: "Nuestros partners",            },
    { id: "location",  titulo: "Dónde estamos",                },
]

export const Home = () => {
    return (
        <main>
            {SECTIONS.map((section) => (
                <section
                    key={section.id}
                    id={section.id}
                    // Estilos en línea a propósito: son de usar y tirar.
                    // No merecen entrar en una hoja de estilos porque este
                    // archivo entero desaparece en WEB-04.
                    style={{
                        // Altura suficiente para que haya scroll de verdad
                        // y se pueda comprobar el salto entre anclas.
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
                        Sección provisional · <code>#{section.id}</code> 
                    </p>
                </section>
            ))}
        </main>
    )
}