/**
 * CÓMO FUE.
 *
 * El resumen de un servicio ya cerrado: días, horas trabajadas, tareas y
 * fotos subidas. Solo aparece al final, cuando los cuatro números son
 * definitivos; antes serían provisionales y no dirían nada.
 *
 * Las horas se cuentan de las reales, no de las contratadas: es lo que
 * de verdad se estuvo allí.
 *
 * Estilos: dashboard.css, sección 10 (cf-wrecap).
 */

const MINUTE = 60 * 1000;

/** Los minutos trabajados, sumando los días que se cerraron. */
const workedMinutes = (days) =>
    days.reduce((total, day) => {
        if (!day.started_at || !day.finished_at) return total;

        return total + (new Date(day.finished_at) - new Date(day.started_at)) / MINUTE;
    }, 0);

/** 114 -> "1 h 54" · 45 -> "45 min" */
const asTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const rest = Math.round(minutes % 60);

    if (hours === 0) return `${rest} min`;

    return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
};

export const WorkerRecap = ({ booking }) => {
    if (booking.status !== "completed") return null;

    const worked = workedMinutes(booking.days);
    const done = booking.tasks.filter((task) => task.status === "completed").length;
    const photos = booking.tasks.reduce((total, task) => total + (task.photos?.length || 0), 0);

    return (
        <section className="cf-wblock">
            <h2 className="cf-wblock__title">Cómo fue</h2>

            <div className="cf-wrecap">
                <div className="cf-wrecap__item">
                    <span className="cf-wrecap__n">{booking.days.length}</span>
                    <span className="cf-wrecap__label">
                        {booking.days.length === 1 ? "día" : "días"}
                    </span>
                </div>

                {/* Sin horas reales (servicios anteriores a esta pantalla)
                    el dato se calla en vez de enseñar un cero. */}
                {worked > 0 && (
                    <div className="cf-wrecap__item">
                        <span className="cf-wrecap__n">{asTime(worked)}</span>
                        <span className="cf-wrecap__label">trabajadas</span>
                    </div>
                )}

                <div className="cf-wrecap__item">
                    <span className="cf-wrecap__n">{done} de {booking.tasks.length}</span>
                    <span className="cf-wrecap__label">tareas</span>
                </div>

                {photos > 0 && (
                    <div className="cf-wrecap__item">
                        <span className="cf-wrecap__n">{photos}</span>
                        <span className="cf-wrecap__label">
                            {photos === 1 ? "foto" : "fotos"}
                        </span>
                    </div>
                )}
            </div>
        </section>
    );
};
