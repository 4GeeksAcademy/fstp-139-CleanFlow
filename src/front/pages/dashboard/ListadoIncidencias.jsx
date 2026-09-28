/**
 * INCIDENCIAS · la pantalla del encargado.
 *
 * Todo lo que ha salido mal, lo cuente el trabajador (#18) o el cliente
 * al reclamar (#83). Se filtran por estado, por motivo y por quién las
 * abrió, y se cierran con una nota.
 *
 * Es el último eslabón del flujo: hasta ahora se registraban problemas
 * que nadie podía resolver. Al cerrar la reclamación de un cliente, su
 * reserva sale de "en revisión" sola.
 *
 * Estilos: dashboard.css, sección 11 (cf-incidents y cf-incard).
 */

import "../../dashboard.css";
import { useCallback, useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { getIncidents, resolveIncident } from "../../services/incidentService";
import { INCIDENTS_CHANGED } from "../../components/dashboard/incidents/IncidentCount";
import { IncidentCard } from "../../components/dashboard/incidents/IncidentCard";
import { BookingZoom } from "../../components/dashboard/bookings/BookingZoom";
import { ResolveForm } from "../../components/dashboard/incidents/ResolveForm";

// Las dos pestañas, con lo que dice cada una cuando se queda vacía.
const TABS = [
    { value: "false", label: "Abiertas", empty: "No hay ninguna incidencia sin resolver." },
    { value: "true", label: "Resueltas", empty: "Todavía no has cerrado ninguna." },
];

// Los dos desplegables preguntan cosas distintas. En ambos, el primer
// valor quiere decir "no filtres".

// El motivo: de qué lado vino el problema. Mismas palabras que ve el
// trabajador al abrirla, para no tener dos vocabularios.
const TYPES = [
    { value: "", label: "Cualquier motivo" },
    { value: "client", label: "Por algo del cliente" },
    { value: "company", label: "Por algo nuestro" },
];

// Quién la escribió, que es otra pregunta: el cliente solo abre
// incidencias por algo nuestro, pero el trabajador abre de los dos
// motivos. Se filtra por aquí para ver quién espera respuesta.
const SOURCES = [
    { value: "", label: "Quién la abrió" },
    { value: "worker", label: "La abrió el trabajador" },
    { value: "client", label: "La abrió el cliente" },
];

const SKELETON_ROWS = 3;

export const ListadoIncidencias = () => {
    const { store, dispatch } = useGlobalReducer();

    const [incidents, setIncidents] = useState([]);
    const [resolved, setResolved] = useState("false");
    const [type, setType] = useState("");
    const [source, setSource] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [zoomed, setZoomed] = useState(null);

    // Los contadores se piden aparte y sin filtrar: tienen que decir
    // cuántas hay en total, no cuántas quedan tras recortar la lista.
    const [counts, setCounts] = useState({ false: 0, true: 0 });

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        const result = await getIncidents({ resolved, type, source }, store.token);

        // Sesión caducada: se cierra aquí y ProtectedRoutes hace el resto.
        if (result.status === 401) {
            setLoading(false);
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (result.ok) setIncidents(result.data.incidents);
        else setError(result.data.message);

        setLoading(false);
    }, [resolved, type, source, store.token, dispatch]);

    useEffect(() => { load(); }, [load]);

    // Los dos números del encabezado, en paralelo.
    const loadCounts = useCallback(async () => {
        const [open, closed] = await Promise.all([
            getIncidents({ resolved: "false" }, store.token, true),
            getIncidents({ resolved: "true" }, store.token, true),
        ]);

        setCounts({
            false: open.ok ? open.data.count : 0,
            true: closed.ok ? closed.data.count : 0,
        });
    }, [store.token]);

    useEffect(() => { loadCounts(); }, [loadCounts]);


    // ---------- CERRAR UNA INCIDENCIA ----------

    // Cuál se está resolviendo (null = el diálogo cerrado) y si hay una
    // llamada en marcha.
    const [resolving, setResolving] = useState(null);
    const [saving, setSaving] = useState(false);

    /**
     * Guarda la nota y cierra la incidencia.
     *
     * Al resolver la reclamación de un cliente, su reserva sale de "en
     * revisión" sola: Booking.confirmation mira las que siguen abiertas,
     * así que aquí no hay que tocar la reserva.
     */
    const handleResolve = async (incident, resolution) => {
        setSaving(true);
        setError("");

        const result = await resolveIncident(incident.incident_id, resolution, store.token);

        setSaving(false);

        if (result.status === 401) {
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (!result.ok) {
            setError(result.data.message);
            return;
        }

        // Se cierra el diálogo, se recarga la lista y se avisa al menú
        // para que el número baje sin esperar a su próximo repaso.
        setResolving(null);
        await load();
        await loadCounts();
        window.dispatchEvent(new Event(INCIDENTS_CHANGED));
    };

    const filtering = Boolean(type || source);

    return (
        <div className="cf-incidents">

            {/* ---------- CABECERA ---------- */}

            <div className="cf-incidents__header">
                <div>
                    {/* El grupo del sidebar al que pertenece la página. */}
                    <p className="cf-dash-eyebrow">Operativa</p>
                    <h1 className="cf-incidents__title">Incidencias</h1>
                    <p className="cf-incidents__lede">
                        Lo que ha salido mal en los servicios. Resuélvelas con una nota:
                        el cliente la verá.
                    </p>
                </div>
            </div>

            {error && <p className="cf-dash-alert" role="alert">{error}</p>}

            {/* ---------- FILTROS ----------
                Pestañas a la izquierda y los dos desplegables a la
                derecha, como en el resto del panel. */}

            <div className="cf-incidents__toolbar">
                <div className="cf-services__tabs">
                    {TABS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className="cf-services__tab"
                            aria-pressed={resolved === option.value}
                            onClick={() => setResolved(option.value)}
                        >
                            {option.label}
                            {/* Las abiertas en terracota: son las que piden algo. */}
                            <span
                                className={`cf-services__count${
                                    option.value === "false" && counts.false > 0
                                        ? " cf-dash-count--attention"
                                        : ""
                                }`}
                            >
                                {counts[option.value]}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="cf-incidents__picks">
                    <select
                        className={`cf-incidents__pick${type ? " cf-incidents__pick--on" : ""}`}
                        aria-label="Filtrar por motivo"
                        value={type}
                        onChange={(event) => setType(event.target.value)}
                    >
                        {TYPES.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>

                    <select
                        className={`cf-incidents__pick${source ? " cf-incidents__pick--on" : ""}`}
                        aria-label="Filtrar por quién la abrió"
                        value={source}
                        onChange={(event) => setSource(event.target.value)}
                    >
                        {SOURCES.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ---------- LISTA ---------- */}

            {loading ? (
                <ul className="cf-incidents__list">
                    {Array.from({ length: SKELETON_ROWS }, (_, row) => (
                        <li key={row} aria-hidden="true">
                            <div className="cf-incard">
                                <div className="cf-dash-skel cf-incard__skel-top"></div>
                                <div className="cf-dash-skel cf-incard__skel-ref"></div>
                                <div className="cf-dash-skel cf-incard__skel-text"></div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : incidents.length === 0 ? (
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-check" aria-hidden="true"></i>
                    </span>
                    <p className="cf-dash-state__title">
                        {filtering ? "Ninguna coincide" : "Nada por aquí"}
                    </p>
                    <p className="cf-dash-state__text">
                        {filtering
                            ? "Prueba con otro motivo o con otra persona."
                            : TABS.find((option) => option.value === resolved).empty}
                    </p>
                </div>
            ) : (
                <ul className="cf-incidents__list">
                    {incidents.map((incident) => (
                        <IncidentCard
                            key={incident.incident_id}
                            incident={incident}
                            busy={saving}
                            onResolve={setResolving}
                            onZoom={setZoomed}
                        />
                    ))}
                </ul>
            )}

            <BookingZoom photo={zoomed} onClose={() => setZoomed(null)} />

            <ResolveForm
                incident={resolving}
                saving={saving}
                onSubmit={handleResolve}
                onClose={() => setResolving(null)}
            />

        </div>
    );
};
