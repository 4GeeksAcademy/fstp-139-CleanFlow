/**
 * CÓMO QUEDÓ.
 *
 * El antes y el después que subió el trabajador al cerrar cada tarea.
 * Se enseñan en parejas, bajo el nombre de su tarea.
 *
 * Si ninguna tarea tiene fotos, el bloque no se pinta: un apartado vacío
 * solo hace pensar que algo falla.
 *
 * Estilos: dashboard.css (cf-bookshots).
 */

const LABELS = { before: "Antes", after: "Después" };

// El orden en que se enseñan, se hayan subido como se hayan subido.
const ORDER = { before: 0, after: 1 };

/** Las tareas que tienen alguna foto, con las suyas ya ordenadas. */
const tasksWithPhotos = (tasks) =>
    tasks
        .filter((task) => task.photos?.length)
        .map((task) => ({
            ...task,
            photos: [...task.photos].sort((one, two) => ORDER[one.kind] - ORDER[two.kind]),
        }));

export const BookingPhotos = ({ tasks, onZoom }) => {
    const shown = tasksWithPhotos(tasks);

    if (shown.length === 0) return null;

    return (
        <section className="cf-bookblock">
            <h2 className="cf-bookblock__title">Cómo quedó</h2>

            <div className="cf-bookshots">
                {shown.map((task) => (
                    <div key={task.booking_task_id}>
                        <p className="cf-bookshots__task">{task.task_name}</p>

                        <div className="cf-bookshots__pair">
                            {task.photos.map((photo) => {
                                const label = `${LABELS[photo.kind] || "Foto"} · ${task.task_name}`;

                                return (
                                    <button
                                        key={photo.media_id}
                                        type="button"
                                        className="cf-bookshot"
                                        onClick={() => onZoom({ url: photo.media_url, label })}
                                    >
                                        <img
                                            className="cf-bookshot__img"
                                            src={photo.media_url}
                                            alt={label}
                                            loading="lazy"
                                        />
                                        <span className="cf-bookshot__tag">
                                            {LABELS[photo.kind] || "Foto"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
