/**
 * LA NOTA DEL TRABAJADOR (#20).
 *
 * Su media y cuántas valoraciones la forman, en la cabecera de Mis
 * tareas. Un dato, no una pantalla: lo ve cada mañana al abrir para
 * mirar sus servicios.
 *
 * No enseña quién puso cada nota, y el backend tampoco lo manda: el
 * cliente valora el servicio, no habla de quien fue a su casa.
 *
 * Va aquí porque el panel todavía no tiene página de inicio. Cuando la
 * tenga (#23) se puede mover.
 *
 * Estilos: dashboard.css, sección 13 (cf-mine).
 */

import { useEffect, useState } from "react";
import { getMyRating } from "../../../services/reviewService";
import { Stars } from "../bookings/Stars";

export const WorkerRating = ({ token }) => {
    // null = aún no se sabe o la consulta falló
    const [rating, setRating] = useState(null);

    useEffect(() => {
        // active: al salir de la pantalla ya no se escribe en el estado.
        let active = true;

        const load = async () => {
            const result = await getMyRating(token);

            if (active && result.ok) setRating(result.data);
        };

        load();

        return () => { active = false; };
    }, [token]);

    // Mientras no se sepa no se pinta nada: un hueco vacío en la cabecera
    // se nota más que la ausencia del bloque.
    if (!rating) return null;

    return (
        <div className="cf-mine">
            <span className="cf-mine__label">Tu nota</span>

            {rating.total > 0 ? (
                <>
                    <span className="cf-mine__row">
                        {/* La coma es lo que se escribe en español. */}
                        <span className="cf-mine__num">
                            {String(rating.average).replace(".", ",")}
                        </span>
                        <Stars value={rating.average} size={16} />
                    </span>
                    <span className="cf-mine__count">
                        {rating.total} {rating.total === 1 ? "valoración" : "valoraciones"}
                    </span>
                </>
            ) : (
                <span className="cf-mine__count">Sin valoraciones todavía</span>
            )}
        </div>
    );
};
