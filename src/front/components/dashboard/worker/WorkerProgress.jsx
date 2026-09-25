/**
 * PROGRESO DE LAS TAREAS.
 *
 * Una barra fina y "3 de 5". Sin porcentajes: al trabajador le importa
 * cuántas le quedan, no el número redondo.
 *
 * Estilos: dashboard.css (cf-progress).
 */

export const WorkerProgress = ({ tasks }) => {
    const total = tasks.length;

    if (total === 0) return null;

    const done = tasks.filter((task) => task.status === "completed").length;

    return (
        <p className="cf-progress">
            <span className="cf-progress__track">
                <span
                    className="cf-progress__fill"
                    style={{ width: `${(done / total) * 100}%` }}
                ></span>
            </span>
            {done} de {total}
        </p>
    );
};
