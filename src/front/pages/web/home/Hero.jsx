/**
 * Primera pantalla de la landing.
 *
 * Tres capas, y el orden del JSX es el orden de apilado: la foto, el velo
 * que la aclara y el contenido encima. Estilos en web.css.
 *
 * Aquí va el único <h1> de la página; las ocho secciones usan <h2>.
 */

import { Link } from "react-router-dom";
import useGlobalReducer from "../../../hooks/useGlobalReducer";
import heroImage from "../../../assets/img/hero-salon.jpg";


// Convierte una nota (4.8) en las cinco clases de icono a pintar.
const starIcons = (average) =>
    [1, 2, 3, 4, 5].map((position) => {
        if (average >= position) return "fa-solid fa-star";
        if (average >= position - 0.5) return "fa-solid fa-star-half-stroke";
        return "fa-regular fa-star";
    })


export const Hero = () => {

    // La nota real, la misma que enseña la sección de opiniones más abajo:
    // dos números distintos para lo mismo en la misma página no se
    // sostienen. Del store y no con su propia llamada, que las dos están
    // en esta pantalla y sería pedir lo mismo dos veces. En null mientras
    // llega, y también si todavía no hay ninguna valoración.
    const { store } = useGlobalReducer()

    const average = store.reviewsAverage

    return (
        <section id="hero" className="cf-hero">

            {/* alt vacío: es decorativa. Lo que cuenta ya lo dice el
                titular, y con texto el lector de pantalla lo repetiría. */}
            <img
                className="cf-hero__photo"
                src={heroImage}
                alt=""
                loading="eager"
            />

            <div className="cf-hero__veil" aria-hidden="true"></div>

            <div className="cf-hero__content">
                <div className="cf-container">

                    <p className="cf-hero__label">Limpieza para tu hogar</p>

                    <h1 className="cf-hero__title">
                        Tu casa en calma. Tu mente en paz.
                    </h1>

                    <p className="cf-hero__lede">
                        Transformamos tu espacio en un refugio impecable, para que
                        cada regreso a casa sea tu mejor momento del día.
                    </p>

                    <div className="cf-hero__actions">

                        {/* A la ruta protegida del catálogo, no al login: si no
                            hay sesión, ProtectedRoutes manda al login y después
                            vuelve aquí (WEB-15). Mismo destino que el navbar. */}
                        <Link to="/dashboard/service-catalog" className="cf-btn">
                            Reservar ahora
                        </Link>

                        {/* <Link> y no <a href="#services">: así lo gestionan
                            React Router y ScrollToTop, igual que el navbar. */}
                        <Link to="/#services" className="cf-btn cf-btn--ghost">
                            Ver servicios
                        </Link>

                    </div>

                </div>
            </div>

            {/* ---------- VALORACIONES ----------
                Sin ninguna todavía, la banda no se pinta: una nota inventada
                vende más, pero deja de ser verdad en cuanto alguien la mira. */}
            {average !== null && (
                <div className="cf-hero__rating">
                    <div className="cf-container">
                        <div className="cf-hero__rating-in">

                            {/* toLocaleString: 4.5 se escribe "4,5" en español. */}
                            <span className="cf-hero__score">
                                {average.toLocaleString("es-ES", {
                                    minimumFractionDigits: 1,
                                })}
                            </span>

                            {/* aria-hidden: la nota ya se lee en el número de al
                                lado; si no, se cantarían cinco iconos sin sentido. */}
                            <span className="cf-hero__stars" aria-hidden="true">
                                {starIcons(average).map((icon, index) => (
                                    <i key={index} className={icon}></i>
                                ))}
                            </span>

                            <span className="cf-hero__reviews">
                                <b>Valoración media</b>
                                sobre {store.reviewsTotal}{" "}
                                {store.reviewsTotal === 1 ? "opinión" : "opiniones"} de clientes
                            </span>

                        </div>
                    </div>
                </div>
            )}

        </section>
    )
}
