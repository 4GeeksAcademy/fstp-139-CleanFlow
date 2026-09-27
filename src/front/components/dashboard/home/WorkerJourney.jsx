import { serviceName } from "./workerHomeData";
import { timeOf } from "../bookings/bookingFormat";

export const WorkerJourney = ({ journey, current }) => journey.length > 0 && (
    <section className="cf-worker-home__journey" aria-labelledby="journey-title">
        <h2 id="journey-title">Tu jornada</h2>
        <ol>
            {journey.map((row) => (
                <li key={row.key} aria-current={row.key === current?.key ? "step" : undefined}>
                    <span className="cf-worker-home__stop" aria-hidden="true" />
                    <span>{timeOf(row.day.starts_at)} – {timeOf(row.day.ends_at)}</span>
                    <strong>{serviceName(row.booking)}</strong>
                    <small>{row.day.finished_at || row.booking.status === "completed" ? "Terminado"
                        : row.key === current?.key ? "Ahora" : "Pendiente"}</small>
                </li>
            ))}
        </ol>
    </section>
);
