/**
 * DATOS DE CONTACTO DE CLEANFLOW.
 *
 * Un único sitio del que salen.
 *
 * ⚠️ SON PROVISIONALES. Hay que sustituirlos por los reales antes de la
 * entrega, incluidas las URL de redes, que apuntan a las portadas de las
 * plataformas y no a perfiles de CleanFlow.
 */

export const COMPANY = {
    name: "CleanFlow",

    // Frase de presentación. La usa el pie y previsiblemente la sección
    // "Sobre nosotros" de la landing (WEB-06).
    tagline: "Limpieza profesional para hogares y oficinas en Madrid. Personal propio, productos incluidos y reserva en dos minutos.",

    // La dirección va en dos campos porque se lee en dos líneas.
    street: "Calle de ejemplo, 12",
    city: "28001 Madrid",

    // Dos formas del mismo número: el enlace tel: no admite espacios.
    phone: "+34 693 428 725",
    phoneLink: "+34693428725",

    email: "prueba@cleanflow.es",

    // Un tramo por línea: quien lo pinta recorre el array.
    schedule: [
        "Lunes a Viernes: 08:00 - 20:00",
        "Sábados: 09:00 - 14:00",
        "Domingos: cerrado",
    ],
}


// Perfiles de redes. Con url en null, el icono no se pinta: uno que no
// lleva a ninguna parte queda peor que no tenerlo.
// Los icon son clases de Font Awesome, que se carga en index.html.
export const SOCIAL_NETWORKS = [
    { name: "Instagram", url: "https://www.instagram.com/", icon: "fa-brands fa-instagram" },
    { name: "Facebook",  url: "https://www.facebook.com/?locale=es_ES", icon: "fa-brands fa-facebook" },
    { name: "LinkedIn",  url: "https://www.linkedin.com/home", icon: "fa-brands fa-linkedin" },
]
