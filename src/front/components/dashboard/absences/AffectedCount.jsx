/**
 * CONTADOR DE RESERVAS AFECTADAS (#15, #75).
 *
 * YA NO SE PINTA. Estaba junto a "Reservas afectadas" en el menú, y esa
 * entrada desapareció: ahora el aviso lo da BookingsCount sobre
 * "Reservas", sumando las afectadas y las incidencias.
 *
 * Se conserva por lo mismo que la pantalla de Reservas afectadas: sigue
 * respondiendo por su URL y, si algún día vuelve al menú, su contador
 * está aquí. Si se decide limpiarla, este archivo se va con ella.
 *
 * Pide solo el número (count_only) y lo mantiene al día sin recargar:
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
