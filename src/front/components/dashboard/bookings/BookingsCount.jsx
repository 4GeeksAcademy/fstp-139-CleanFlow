/**
 * CONTADOR DE RESERVAS DEL MENÚ.
 *
 * La pastilla junto a "Reservas": las afectadas más las reservas con
 * incidencias abiertas, sumadas.
 *
 * Una sola y no dos porque el menú solo tiene que decir "mira esto";
 * al entrar ya se ve en sus pestañas de qué es cada cosa. Dos pastillas
 * seguidas en el mismo enlace se leen como un número de cuatro cifras.
 *
 * Pide solo los números (count_only) y los mantiene al día igual que
 * hacían los dos contadores que sustituye:
 *
 *   · cada 30 segundos
 *   · al volver a la pestaña (focus)
 *   · al cambiar de página (pathname)
 *   · cuando otra pantalla avisa, con refreshAffected() o INCIDENTS_CHANGED
 *
 * Estilos: dashboard.css (cf-side__count).
 */

import { useEffect, useState } from "react";
import { getAffected } from "../../../services/absenceService";
import { getIncidents } from "../../../services/incidentService";
import { INCIDENTS_CHANGED } from "../incidents/IncidentCount";

// Cada cuánto se vuelve a preguntar, en milisegundos.
const REFRESH_MS = 30000;

export const BookingsCount = ({ token, pathname }) => {
    // null = aún no se sabe o alguna de las dos consultas falló
    const [count, setCount] = useState(null);

    useEffect(() => {
        // active: al desmontar, ya no se escribe en el estado.
        // sequence: si se solapan dos consultas, solo vale la última.
        let active = true;
        let sequence = 0;

        const refresh = async () => {
            const requestId = ++sequence;

            // En paralelo: son dos preguntas independientes y encadenarlas
            // solo haría esperar el doble.
            const [afectadas, incidencias] = await Promise.all([
                getAffected(token, true),
                getIncidents({ resolved: "false" }, token, true),
            ]);

            if (!active || requestId !== sequence) return;

            setCount(afectadas.ok && incidencias.ok
                ? afectadas.data.count + incidencias.data.count
                : null);
        };

        refresh();

        const timer = window.setInterval(refresh, REFRESH_MS);
        window.addEventListener("cleanflow:affected-changed", refresh);
        window.addEventListener(INCIDENTS_CHANGED, refresh);
        window.addEventListener("focus", refresh);

        return () => {
            active = false;
            window.clearInterval(timer);
            window.removeEventListener("cleanflow:affected-changed", refresh);
            window.removeEventListener(INCIDENTS_CHANGED, refresh);
            window.removeEventListener("focus", refresh);
        };
    }, [token, pathname]);

    // Solo se pinta cuando hay algo: un 0 en el menú es ruido.
    if (!count) return null;

    // El texto oculto completa lo que oye el lector: "Reservas, 5 necesitan atención".
    return (
        <span className="cf-side__count">
            {count}
            <span className="sr-only"> necesitan atención</span>
        </span>
    );
};
