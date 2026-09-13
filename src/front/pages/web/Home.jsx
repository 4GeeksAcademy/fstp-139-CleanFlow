/**
 * LANDING.
 *
 * Este archivo solo importa y ordena. Cada sección vive en su propio
 * componente dentro de home/, para que varias personas puedan trabajar
 * sin tocar el mismo archivo.
 */

import { Hero } from "./home/Hero"
import { ServicesSection } from "./home/ServicesSection"
import { ReviewsSection } from "./home/ReviewsSection"
import { AboutSection } from "./home/AboutSection"
import { WhyCleanFlowSection } from "./home/WhyCleanFlowSection"
import { PartnersSection } from "./home/PartnersSection"
import { ContactSection } from "./home/ContactSection"
import { LocationSection } from "./home/LocationSection"

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