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
                        <article
                            className="cf-review-card"
                            key={review.review_id}
                        >
                            <span
                                className="cf-review-card__quote"
                                aria-hidden="true"
                            >
                                “
                            </span>

                            <div
                                className="cf-review-card__stars"
                                aria-hidden="true"
                            >
                                {Array.from({ length: 5 }, (_, index) => (
                                    <span
                                        key={index}
                                        className={
                                            index < review.rating
                                                ? "cf-review-card__star cf-review-card__star--active"
                                                : "cf-review-card__star"
                                        }
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>

                            <span className="sr-only">
                                {review.rating} de 5 estrellas
                            </span>

                            <p className="cf-review-card__comment">
                                {review.comment}
                            </p>

                            <p className="cf-review-card__client">
                                {review.client_name}
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
};