/**
 * QUÉ CONTRATÉ.
 *
 * Las tareas del servicio y las notas que dejó el cliente al reservar.
 *
 * Las tareas vienen repetidas (tres habitaciones son tres veces la misma
 * tarea), así que se agrupan por nombre y se enseña cuántas hay y
 * cuántas quedaron cerradas.
 *
 * Estilos: dashboard.css (cf-booktasks y cf-booknotes).
 */

/** Agrupa las tareas por nombre: [{ name, total, done }]. */
const groupTasks = (tasks) => {
    const groups = new Map();

    tasks.forEach((task) => {
        const group = groups.get(task.task_name) || { name: task.task_name, total: 0, done: 0 };

        group.total += 1;
        if (task.status === "completed") group.done += 1;

        groups.set(task.task_name, group);
    });

    return [...groups.values()];
};

export const BookingWhat = ({ booking }) => {
    const groups = groupTasks(booking.tasks);

    return (
        <section className="cf-bookblock">
            <h2 className="cf-bookblock__title">Qué contraté</h2>

            {/* Hay servicios que se contratan solo por horas, sin tareas. */}
            {groups.length > 0 ? (
                <ul className="cf-booktasks">
                    {groups.map((group) => {
                        const finished = group.done === group.total;

                        return (
                            <li
                                key={group.name}
                                className={`cf-booktask${finished ? "" : " cf-booktask--todo"}`}
                            >
                                <span className="cf-booktask__check">
                                    <i
                                        className={`fa-solid ${finished ? "fa-check" : "fa-minus"}`}
                                        aria-hidden="true"
                                    ></i>
                                </span>

                                {group.name}

                                <span className="cf-booktask__count">
                                    {group.total > 1 && `×${group.total} · `}
                                    {group.done} de {group.total} {group.done === 1 ? "hecha" : "hechas"}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="cf-bookdetail__sub">Este servicio se contrató solo por horas.</p>
            )}

            {booking.client_notes && (
                <p className="cf-booknotes">«{booking.client_notes}»</p>
            )}
        </section>
    );
};
