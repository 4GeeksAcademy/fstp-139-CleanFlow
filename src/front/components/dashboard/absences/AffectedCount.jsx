/**
 * CONTADOR DE RESERVAS AFECTADAS DEL MENÚ (#15, #75).
 *
 * La pastilla junto a "Reservas afectadas". Pide solo el número
 * (count_only) y lo mantiene al día sin recargar la página:
 *
 *   · cada 30 segundos
 *   · al volver a la pestaña (focus)
 *   · al cambiar de página (pathname)
 *   · cuando otra pantalla avisa con refreshAffected()
 *
 * Estilos: dashboard.css (cf-side__count).
 */

import { useEffect, useState } from "react";
import { getAffected } from "../../../services/absenceService";

// Cada cuánto se vuelve a preguntar, en milisegundos.
const REFRESH_MS = 30000;

export const AffectedCount = ({ token, pathname }) => {
    // null = aún no se sabe o la consulta falló
    const [count, setCount] = useState(null);

    useEffect(() => {
        // active: al desmontar, ya no se escribe en el estado.
        // sequence: si se solapan dos consultas, solo vale la última.
        let active = true;
        let sequence = 0;

        const refresh = async () => {
            const requestId = ++sequence;
            const result = await getAffected(token, true);

            if (active && requestId === sequence) setCount(result.ok ? result.data.count : null);
        };

        refresh();

        const timer = window.setInterval(refresh, REFRESH_MS);
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
    if (!count) return null;

    // El texto oculto completa lo que oye el lector: "Reservas afectadas, 3 pendientes".
    return (
        <span className="cf-side__count">
            {count}
            <span className="sr-only"> pendientes</span>
        </span>
    );
};
