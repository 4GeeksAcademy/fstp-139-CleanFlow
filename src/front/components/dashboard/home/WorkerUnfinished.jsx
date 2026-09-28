import { Link } from "react-router-dom";
import { serviceName } from "./workerHomeData";

export const WorkerUnfinished = ({ items }) => items.length > 0 && (
    <section className="cf-worker-home__card cf-worker-home__unfinished" aria-labelledby="unfinished-title">
        <p className="cf-dash-eyebrow">Antes de seguir</p>
        <h2 id="unfinished-title">Se te quedó a medias</h2>
        <ul className="cf-worker-home__list">
            {items.map((item) => (
                <li key={item.key}>
                    <Link to={item.to}>
                        <strong>{item.text}</strong>
                        <span>{serviceName(item.booking)} · {item.booking.address?.city || "Ver servicio"} →</span>
                    </Link>
                </li>
            ))}
        </ul>
    </section>
);
