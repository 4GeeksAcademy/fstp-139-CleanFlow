/**
 * LANDING.
 *
 * Este archivo solo importa y ordena. Cada sección vive en su propio
 * componente dentro de home/, para que varias personas puedan trabajar a
 * la vez sin tocar el mismo archivo.
 *
 * El orden de aquí es el orden en pantalla.
 */

import { Hero } from "./home/Hero";
import { ServicesSection } from "./home/ServicesSection";
import { ReviewsSection } from "./home/ReviewsSection";
import { AboutSection } from "./home/AboutSection";
import { WhyCleanFlowSection } from "./home/WhyCleanFlowSection";
import { PartnersSection } from "./home/PartnersSection";
import { ContactSection } from "./home/ContactSection";
import { LocationSection } from "./home/LocationSection";


// ---- CÓMO SE AÑADE UNA SECCIÓN ----
//
// 1. Crea su componente en home/. Devuelve SU PROPIA <section id="...">:
//    no la envuelve Home. Así el id vive junto a su contenido y nadie
//    tiene que tocar este archivo para rellenar el suyo.
//
// 2. Impórtala arriba y colócala aquí en su sitio.
//
// 3. Si además debe salir en el menú, añade su id a NAV_LINKS en
//    components/web/Navbar.jsx.
//
// Los ocho id actuales son un contrato: el navbar y el pie apuntan a
// ellos. Cambiar uno rompe esos enlaces sin dar ningún error.

export const Home = () => {
    return (
        <main>
            <Hero />
            <ServicesSection />
            <ReviewsSection />
            <AboutSection />
            <WhyCleanFlowSection />
            <PartnersSection />
            <ContactSection />
            <LocationSection />
        </main>
    )
}