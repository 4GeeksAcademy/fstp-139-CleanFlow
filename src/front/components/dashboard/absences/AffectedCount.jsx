import { useEffect, useState } from "react";
import { getAffected } from "../../../services/absenceService";

export const AffectedCount = ({ token, pathname }) => {
    const [count, setCount] = useState(null);
    useEffect(() => {
        let active = true;
        let sequence = 0;
        const refresh = async () => {
            const requestId = ++sequence;
            const result = await getAffected(token, true);
            if (active && requestId === sequence) setCount(result.ok ? result.data.count : null);
        };
        refresh();
        const timer = window.setInterval(refresh, 30000);
        window.addEventListener("cleanflow:affected-changed", refresh);
        window.addEventListener("focus", refresh);
        return () => {
            active = false;
            window.clearInterval(timer);
            window.removeEventListener("cleanflow:affected-changed", refresh);
            window.removeEventListener("focus", refresh);
        };
    }, [token, pathname]);
    // Solo se pinta cuando hay alguna: un 0 o un "…" en el menú son ruido.
    // El texto oculto completa lo que oye el lector: "Reservas afectadas, 3 pendientes".
    if (!count) return null;

    return (
        <span className="cf-side-count">
            {count}
            <span className="sr-only"> pendientes</span>
        </span>
    );
};
