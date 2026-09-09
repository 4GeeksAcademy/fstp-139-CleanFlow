/**
 * DECIDE ADÓNDE MIRAR TRAS CADA NAVEGACIÓN.
 *
 * Envuelve el contenido de la zona pública desde PublicLayout, así que se
 * entera de todos los cambios de URL de esa zona.
 *
 *   Sin ancla (/register)  -> sube al principio.
 *   Con ancla (/#services) -> baja hasta esa sección.
 *
 * ¿Y no hace eso solo el navegador? Solo al CARGAR la página. React Router
 * cambia de vista sin recargar: reescribe la URL y repinta unos
 * componentes, así que el navegador no se entera de que ha "llegado" a
 * ningún sitio. Aquí se hace a mano.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";


const ScrollToTop = ({ children }) => {

    // key identifica CADA navegación, aunque sea al mismo sitio. Sin ella,
    // pulsar el logo estando ya en la landing no haría nada: ni la ruta ni
    // el ancla cambian, y el efecto no se enteraría.
    const { pathname, hash, key } = useLocation();

    useEffect(() => {

        // Sin ancla: al principio, como en cualquier web.
        if (!hash) {
            window.scrollTo(0, 0);
            return
        }

        // Con ancla: hash llega como "#services" y getElementById lo quiere
        // sin almohadilla, de ahí el slice(1).
        const section = document.getElementById(hash.slice(1));

        // Puede no existir (un ancla inventada a mano). Mejor quedarse
        // quieto que dar un salto raro.
        if (!section) return;

        // Hay gente a quien el desplazamiento animado le marea, y el sistema
        // permite pedir que se reduzca. Si está activado, el salto es seco.
        const slowlyMovement = window.matchMedia("(prefers-reduced-motion: reduce)"). matches;

        section.scrollIntoView({ behavior: slowlyMovement ? "auto" : "smooth"});

    }, [pathname, hash, key]);

    // No pinta nada propio: solo devuelve lo que envuelve.
    return children;
};

export default ScrollToTop;

ScrollToTop.propTypes = {
    children: PropTypes.any
};
