
export const COMPANY = {
    name: "CleanFlow",

    // Frase corta de presentación. La usa el pie, y previsiblemente
    // también la sección "Sobre nosotros" de la landing (WEB-06).
    tagline: "Limpieza profesional para hogares y oficinas en Madrid. Personal propio, productos incluidos y reserva en dos minutos.",

    // La dirección va partida en dos campos y no en una sola cadena,
    // porque una dirección se lee en dos líneas: la calle arriba y el
    // código postal con la ciudad debajo. También lo necesitará así la
    // página de contacto (WEB-09).
    street: "Calle de ejemplo, 12",
    city: "28001 Madrid",
    phone: "+34 693 428 725",
    phoneLink:"+34693428725",
    email: "prueba@cleanflow.es",
    schedule: [
        "Lunes a Viernes: 08:00 - 20:00",
        "Sábados: 09:00 - 14:00",
        "Domingos: cerrado",
    ],
}

export const SOCIAL_NETWORKS = [
    { name: "Instagram", url: "https://www.instagram.com/", icon: "fa-brands fa-instagram" },
    { name: "Facebook",  url: "https://www.facebook.com/?locale=es_ES", icon: "fa-brands fa-facebook" },
    { name: "LinkedIn",  url: "https://www.linkedin.com/home", icon: "fa-brands fa-linkedin" },
]