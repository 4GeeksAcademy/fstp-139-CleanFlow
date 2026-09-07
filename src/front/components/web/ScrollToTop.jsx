import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";

// This component allows the scroll to go to the beginning when changing the view,
// otherwise it would remain in the position of the previous view. 
// Investigate more about this React behavior :D 

const ScrollToTop = ({ children }) => {
    
    // key es un identificador único de CADA navegación: aunque vayas dos
    // veces al mismo sitio, la key cambia. Es lo que permite reaccionar a
    // pulsar el logo estando ya en la landing, un caso en el que ni la
    // ruta ni el ancla cambian y por tanto nada avisaría.
    const { pathname, hash, key } = useLocation();

    useEffect(() => {
        if (!hash) {
            window.scrollTo(0, 0);
            return
        }
        
        const section = document.getElementById(hash.slice(1));

        if (!section) return;

        const slowlyMovement = window.matchMedia("(prefers-reduced-motion: reduce)"). matches;

        section.scrollIntoView({ behavior: slowlyMovement ? "auto" : "smooth"});

    }, [pathname, hash, key]);

    return children;
};

export default ScrollToTop;

ScrollToTop.propTypes = {
    children: PropTypes.any
};