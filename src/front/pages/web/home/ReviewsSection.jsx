/**
 * QUÉ OPINAN NUESTROS CLIENTES (#41).
 *
 * Las últimas opiniones de CleanFlow y la media que forman. Nunca de
 * Google ni de ninguna fuente externa: son las mismas notas que dejan
 * los clientes al terminar un servicio (#20).
 *
 * Lo que sale de cada uno: su nombre de pila con la inicial del
 * apellido, su foto de perfil si la tiene, el servicio y cuándo fue.
 * Las fotos que sube al valorar no salen nunca: son el interior de su
 * casa y las hizo para nosotros, no para publicarlas.
 *
 * Estilos: web.css, bloque cf-reviews.
 */

import { useEffect, useState } from "react";
import { getReviewsSummary } from "../../../services/reviewService";
import { Stars } from "../../../components/dashboard/bookings/Stars";

/**
 * "hace 2 semanas".
 *
 * En relativo y nunca el día exacto: eso diría qué tarde concreta hubo
 * alguien en casa de un cliente. Además envejece mejor, que es de lo que
 * se trata en una sección de opiniones.
 */
const timeAgo = (iso) => {
    if (!iso) return "";

    const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000);

    if (days < 1) return "hoy";
    if (days === 1) return "ayer";
    if (days < 7) return `hace ${days} días`;
    if (days < 14) return "hace una semana";
    if (days < 31) return `hace ${Math.floor(days / 7)} semanas`;
    if (days < 62) return "hace un mes";
    if (days < 365) return `hace ${Math.floor(days / 30)} meses`;

    return "hace más de un año";
};

/** "Pablo V." -> "PV", para cuando el cliente no tiene foto. */
const initialsOf = (name) => (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

/**
 * Su foto de perfil, o sus iniciales.
 *
 * La cara la eligió él y por eso puede salir; si no tiene, van sus
 * iniciales. Nunca una foto de archivo: poner al lado de su nombre una
 * cara que no es la suya sería mentir.
 *
 * El onError cubre una URL que ya no responde: antes de un icono roto,
 * las iniciales.
 */
const Face = ({ review }) => {
    const [failed, setFailed] = useState(false);

    if (!review.client_avatar_url || failed) {
        return (
            <span className="cf-review-card__face" aria-hidden="true">
                {initialsOf(review.client_name)}
            </span>
        );
    }

    return (
        <span className="cf-review-card__face">
            <img
                src={review.client_avatar_url}
                alt={`Foto de ${review.client_name}`}
                loading="lazy"
                onError={() => setFailed(true)}
            />
        </span>
    );
};

export const ReviewsSection = () => {
    // Los tres juntos: vienen en la misma respuesta y se pintan a la vez.
    const [summary, setSummary] = useState({ average: null, total: 0, reviews: [] });

    useEffect(() => {
        let isMounted = true;

        const loadReviews = async () => {
            const result = await getReviewsSummary();

            if (isMounted && result.ok) {
                setSummary({
                    average: result.data.average,
                    total: result.data.total ?? 0,
                    reviews: result.data.reviews || [],
                });
            }
        };

        loadReviews();

        return () => {
            isMounted = false;
        };
    }, []);

    const { average, total, reviews } = summary;

    // Sin opiniones la sección no aparece: mejor que no exista a que
    // salga vacía o con un "0 sobre 5" que no significa nada.
    if (reviews.length === 0) {
        return null;
    }

    return (
        <section id="reviews" className="cf-reviews">
            <div className="cf-container">
                <div className="cf-reviews__heading">
                    <div>
                        <p className="cf-reviews__eyebrow">
                            Experiencias CleanFlow
                        </p>

                        <h2 className="cf-reviews__title">
                            Qué opinan nuestros clientes
                        </h2>
                    </div>

                    {/* La media, que es lo que de verdad convence: un
                        visitante lee un número antes que ningún comentario. */}
                    {average !== null && (
                        <div className="cf-reviews__score">
                            <span>
                                {/* La coma es lo que se escribe en español. */}
                                <span className="cf-reviews__avg">
                                    {String(average).replace(".", ",")}
                                </span>
                                <span className="cf-reviews__of">sobre 5</span>
                            </span>

                            <span>
                                <Stars value={average} size={17} />
                                <p className="cf-reviews__count">
                                    {total} {total === 1 ? "valoración" : "valoraciones"}
                                </p>
                            </span>
                        </div>
                    )}
                </div>

                <div className="cf-reviews__grid">
                    {reviews.map((review) => (
                        <article className="cf-review-card" key={review.review_id}>
                            <div className="cf-review-card__stars">
                                <Stars value={review.rating} size={15} />
                            </div>

                            <p className="cf-review-card__comment">
                                {review.comment}
                            </p>

                            <div className="cf-review-card__who">
                                <Face review={review} />

                                <div>
                                    <p className="cf-review-card__name">
                                        {review.client_name}
                                    </p>
                                    <p className="cf-review-card__meta">
                                        {review.service_name} · {timeAgo(review.created_at)}
                                    </p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
};