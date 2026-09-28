/**
 * ESTRELLAS (#20).
 *
 * Un solo componente para los dos usos: elegir una nota y enseñar una ya
 * puesta. Lo decide onChange: sin él, solo se lee.
 *
 * En terracota y no en dorado: el dorado de las reseñas de internet no
 * está en la paleta y desentonaría con el resto del panel.
 *
 * Con teclado se recorre como un grupo de opciones de verdad: Tab entra
 * una sola vez, las flechas cambian la nota y los números del 1 al 5 la
 * eligen directa.
 *
 * Estilos: dashboard.css, sección 13 (cf-stars).
 */

import { useRef } from "react";

const MAX = 5;

/** La estrella, dibujada aquí para no depender del icono de nadie. */
const Star = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z"></path>
    </svg>
);

/**
 * value: la nota, de 1 a 5 · 0 o null cuando no hay ninguna
 * onChange: si se pasa, se puede elegir; si no, es solo de lectura
 * label: lo que oye el lector de pantalla al entrar
 * size: el lado de cada estrella en píxeles
 */
export const Stars = ({ value = 0, onChange, label = "Nota", size, count = false }) => {
    const group = useRef(null);

    // Una media como 4,8 pinta 5: la cifra exacta va escrita al lado.
    const filled = Math.round(value);

    // ---------- SOLO LECTURA ----------

    if (!onChange) {
        const marks = size || 18;

        return (
            <span
                className="cf-stars cf-stars--read"
                role="img"
                aria-label={`${value} de ${MAX} estrellas`}
            >
                {Array.from({ length: MAX }, (_, index) => (
                    <span
                        key={index}
                        className={`cf-stars__mark${index < filled ? " cf-stars__mark--on" : ""}`}
                    >
                        <Star size={marks} />
                    </span>
                ))}
            </span>
        );
    }

    // ---------- PARA ELEGIR ----------

    /** Elige la nota y deja el foco en su estrella. */
    const pick = (rating) => {
        onChange(rating);
        group.current?.querySelectorAll("button")[rating - 1]?.focus();
    };

    const handleKeyDown = (event) => {
        // Las flechas mueven una estrella sin salirse del 1 al 5.
        if (["ArrowRight", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            pick(Math.min(MAX, (value || 0) + 1));
            return;
        }

        if (["ArrowLeft", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            pick(Math.max(1, (value || MAX) - 1));
            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            pick(1);
            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            pick(MAX);
            return;
        }

        // Escribir el número es lo más rápido para quien ya sabe qué poner.
        if (/^[1-5]$/.test(event.key)) {
            event.preventDefault();
            pick(Number(event.key));
        }
    };

    const marks = size || 26;

    return (
        <div
            className="cf-stars"
            role="radiogroup"
            aria-label={label}
            ref={group}
            onKeyDown={handleKeyDown}
        >
            {Array.from({ length: MAX }, (_, index) => {
                const rating = index + 1;
                const on = rating <= filled;

                return (
                    <button
                        key={rating}
                        type="button"
                        role="radio"
                        aria-checked={value === rating}
                        aria-label={`${rating} de ${MAX} estrellas`}
                        // Un solo Tab para todo el grupo: dentro se mueve con
                        // las flechas. Sin nota elegida, entra por la primera.
                        tabIndex={value === rating || (!value && rating === 1) ? 0 : -1}
                        className={`cf-stars__btn${on ? " cf-stars__btn--on" : ""}`}
                        onClick={() => onChange(rating)}
                    >
                        <Star size={marks} />
                    </button>
                );
            })}

            {count && value > 0 && (
                <span className="cf-stars__count">{value} de {MAX}</span>
            )}
        </div>
    );
};
