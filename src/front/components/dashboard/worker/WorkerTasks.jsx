/**
 * LAS TAREAS DEL SERVICIO.
 *
 * Cada una con sus dos fotos y su botón de cerrar. Una tarea no se puede
 * marcar sin el antes y el después: son la prueba de cómo quedó, y de
 * ellas vive la confirmación del cliente y la respuesta a una queja.
 *
 * Una tarea cerrada se puede desmarcar mientras el servicio esté en
 * curso; sus fotos se conservan.
 *
 * Solo pinta y avisa: quien sube, borra y marca es la página.
 *
 * Estilos: dashboard.css, sección 10 (cf-wtask).
 */

import { WorkerShot } from "./WorkerShot";

/** La foto de ese tipo, si ya está subida. */
const photoOf = (task, kind) =>
    task.photos?.find((photo) => photo.kind === kind) || null;

/** Agrupa por nombre: [{ name, total }]. Tres habitaciones son una fila. */
const groupTasks = (tasks) => {
    const groups = new Map();

    tasks.forEach((task) => {
        groups.set(task.task_name, (groups.get(task.task_name) || 0) + 1);
    });

    return [...groups].map(([name, total]) => ({ name, total }));
};

export const WorkerTasks = ({ booking, busyTaskId, uploading, onPick, onDeletePhoto, onToggle }) => {
    const { tasks } = booking;

    if (tasks.length === 0) {
        return (
            <section className="cf-wblock">
                <h2 className="cf-wblock__title">Tareas</h2>
                <p className="cf-wdetail__sub">Este servicio se contrató solo por horas.</p>
            </section>
        );
    }

    // Las fotos solo se tocan con el servicio en marcha, igual que exige
    // el backend: ni antes de llegar ni después de finalizar.
    const running = booking.status === "in_progress";
    const done = tasks.filter((task) => task.status === "completed").length;

    // Sin empezar: solo hace falta saber qué hay que hacer. Las tareas se
    // agrupan y no se enseñan los huecos de foto, que todavía no tocan.
    if (booking.status === "confirmed" || booking.status === "pending") {
        return (
            <section className="cf-wblock">
                <h2 className="cf-wblock__title">Qué hay que hacer</h2>

                {groupTasks(tasks).map((group) => (
                    <article key={group.name} className="cf-wtask">
                        <div className="cf-wtask__top">
                            <span className="cf-wtask__check"></span>
                            <span className="cf-wtask__name">
                                {group.name}
                                {group.total > 1 && ` ×${group.total}`}
                            </span>
                        </div>
                    </article>
                ))}
            </section>
        );
    }

    return (
        <section className="cf-wblock">
            <h2 className="cf-wblock__title">Tareas · {done} de {tasks.length}</h2>

            {tasks.map((task) => {
                const before = photoOf(task, "before");
                const after = photoOf(task, "after");
                const complete = task.status === "completed";
                const busy = busyTaskId === task.booking_task_id;
                const ready = Boolean(before && after);

                return (
                    <article
                        key={task.booking_task_id}
                        className={`cf-wtask${complete ? " cf-wtask--done" : ""}`}
                    >
                        <div className="cf-wtask__top">
                            <span className="cf-wtask__check">
                                {complete && <i className="fa-solid fa-check" aria-hidden="true"></i>}
                            </span>

                            <span className="cf-wtask__name">{task.task_name}</span>

                            {complete && running && (
                                <button
                                    type="button"
                                    className="cf-wtask__undo"
                                    disabled={busy}
                                    onClick={() => onToggle(task, false)}
                                >
                                    Desmarcar
                                </button>
                            )}
                        </div>

                        {/* Cerrada y sin servicio en curso: las fotos ya
                            están y no hay nada que tocar, solo mirarlas. */}
                        <div className="cf-wtask__shots">
                            <WorkerShot
                                kind="before"
                                photo={before}
                                uploading={uploading === `${task.booking_task_id}-before`}
                                canEdit={running && !complete}
                                onPick={(kind, file) => onPick(task, kind, file)}
                                onDelete={onDeletePhoto}
                            />
                            <WorkerShot
                                kind="after"
                                photo={after}
                                uploading={uploading === `${task.booking_task_id}-after`}
                                canEdit={running && !complete}
                                onPick={(kind, file) => onPick(task, kind, file)}
                                onDelete={onDeletePhoto}
                            />
                        </div>

                        {running && !complete && (
                            <>
                                {/* El motivo, escrito justo encima del botón
                                    apagado: nadie debería quedarse mirándolo
                                    sin saber qué le falta. */}
                                {!ready && (
                                    <p className="cf-wtask__hint">
                                        <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                                        {before || after
                                            ? `Falta la foto del ${before ? "después" : "antes"}`
                                            : "Hacen falta las dos fotos"}
                                    </p>
                                )}

                                <div className="cf-wtask__actions">
                                    <button
                                        type="button"
                                        className="cf-dash-btn cf-dash-btn--sm"
                                        disabled={!ready || busy}
                                        onClick={() => onToggle(task, true)}
                                    >
                                        <i className="fa-solid fa-check" aria-hidden="true"></i>
                                        Marcar como hecha
                                    </button>
                                </div>
                            </>
                        )}
                    </article>
                );
            })}
        </section>
    );
};
