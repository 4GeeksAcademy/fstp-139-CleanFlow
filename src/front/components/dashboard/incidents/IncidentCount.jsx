/**
 * CONTADOR DE INCIDENCIAS ABIERTAS DEL MENÚ (#19).
 *
 * La pastilla junto a "Incidencias". Mismo patrón que el de Reservas
 * afectadas: pide solo el número (count_only) y lo mantiene al día sin
 * recargar la página:
 *
 *   · cada 30 segundos
 *   · al volver a la pestaña (focus)
 *   · al cambiar de página (pathname)
 *   · cuando la pantalla avisa con el evento, al resolver una
 *
 * Es lo que hace que el encargado entre: sin él, esta pantalla se
 * visitaría cuando alguien se acordara.
 *
 * Estilos: dashboard.css (cf-side__count).
 */

import { useEffect, useState } from "react";
import { getIncidents } from "../../../services/incidentService";

// Cada cuánto se vuelve a preguntar, en milisegundos.
const REFRESH_MS = 30000;

// El aviso que lanza la pantalla al cerrar una incidencia, para que el
// número baje sin esperar a los 30 segundos.
export const INCIDENTS_CHANGED = "cleanflow:incidents-changed";

export const IncidentCount = ({ token, pathname }) => {
    // null = aún no se sabe o la consulta falló
    const [count, setCount] = useState(null);

    useEffect(() => {
        // active: al desmontar, ya no se escribe en el estado.
        // sequence: si se solapan dos consultas, solo vale la última.
        let active = true;
        let sequence = 0;

        const refresh = async () => {
            const requestId = ++sequence;
            const result = await getIncidents({ resolved: "false" }, token, true);

            if (active && requestId === sequence) setCount(result.ok ? result.data.count : null);
        };

        refresh();

        const timer = window.setInterval(refresh, REFRESH_MS);
        window.addEventListener(INCIDENTS_CHANGED, refresh);
        window.addEventListener("focus", refresh);

        return () => {
            active = false;
            window.clearInterval(timer);
            window.removeEventListener(INCIDENTS_CHANGED, refresh);
            window.removeEventListener("focus", refresh);
        };
    }, [token, pathname]);

    // Solo se pinta cuando hay alguna: un 0 o un "…" en el menú son ruido.
    if (!count) return null;

    // El texto oculto completa lo que oye el lector: "Incidencias, 3 sin resolver".
    return (
        <span className="cf-side__count">
            {count}
            <span className="sr-only"> sin resolver</span>
        </span>
    );
};
