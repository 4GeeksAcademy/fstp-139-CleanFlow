import { useEffect, useState } from "react";
import { getPublicReviews } from "../../../services/reviewService";

export const ReviewsSection = () => {
    const [reviews, setReviews] = useState([]);
    const [isProvisional, setIsProvisional] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadReviews = async () => {
            const result = await getPublicReviews();

            if (isMounted && result.ok) {
                setReviews(result.data);
                setIsProvisional(result.provisional === true);
            }
        };

        loadReviews();

        return () => {
            isMounted = false;
        };
    }, []);

    // Si no existen opiniones, la sección no se muestra vacía.
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

                    {isProvisional && (
                        <span className="cf-reviews__example-label">
                            Opiniones de ejemplo
                        </span>
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