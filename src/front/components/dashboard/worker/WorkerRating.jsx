/** Nota media del trabajador, reutilizada en Inicio (#21). */

import { useEffect, useState } from "react";
import { getMyRating } from "../../../services/reviewService";
import useGlobalReducer from "../../../hooks/useGlobalReducer";
import { Stars } from "../bookings/Stars";

export const WorkerRating = ({ token }) => {
    const { dispatch } = useGlobalReducer();
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    // null = aún no se sabe
    const [rating, setRating] = useState(null);

    useEffect(() => {
        // active: al salir de la pantalla ya no se escribe en el estado.
        let active = true;
        setError("");
        setRating(null);

        const load = async () => {
            const result = await getMyRating(token);

            if (!active) return;
            if (result.status === 401) dispatch({ type: "LOGOUT" });
            else if (result.ok) setRating(result.data);
            else setError(result.data?.message || "No se ha podido cargar tu nota.");
        };

        load();

        return () => { active = false; };
    }, [token, dispatch, retry]);

    if (error) return <div role="alert"><p>{error}</p>
        <button className="cf-dash-btn cf-dash-btn--ghost" onClick={() => setRetry((value) => value + 1)}>Reintentar nota</button>
    </div>;
    if (!rating) return <p role="status">Cargando tu nota…</p>;

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
