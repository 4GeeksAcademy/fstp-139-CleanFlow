/**
 * Bandeja compartida de candidaturas y contacto (WEB-12 y WEB-13).
 * Los textos y campos cambian; carga, filtros y estados siguen el mismo patrón.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import useGlobalReducer from "../../../hooks/useGlobalReducer";
import "../../../dashboard.css";

// Las fechas llegan en Madrid sin zona: no las desplazamos al huso del navegador.
const shortMoment = (iso) => iso
    ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} · ${iso.slice(11, 16)}`
    : "Sin fecha";

const newestFirst = (rows) => [...rows].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || "")
);

const InboxFilters = ({ filters, rows, value, onChange, label }) => (
    <div className="cf-services__tabs" role="group" aria-label={label}>
        {filters.map((filter) => (
            <button
                key={filter.value}
                type="button"
                className="cf-services__tab"
                aria-pressed={value === filter.value}
                onClick={() => onChange(filter.value)}
            >
                {filter.label}
                <span className="cf-services__count">
                    {rows.filter((row) => row.status === filter.value).length}
                </span>
            </button>
        ))}
    </div>
);

const InboxStatus = ({ value, labels }) => (
    <span className={`cf-applications__state cf-applications__state--${value}`}>
        <span className="cf-applications__dot" aria-hidden="true" />
        {labels[value] || value}
    </span>
);

const InboxList = ({ rows, config, busy, updatingId, onStatusChange }) => (
    <div className="cf-applications__list">
        {rows.map((row) => {
            const id = row[config.idKey];
            const subject = config.mailSubject?.(row);
            const mailto = `mailto:${encodeURIComponent(row.email)}${subject
                ? `?subject=${encodeURIComponent(subject)}` : ""}`;
            return (
                <article className="cf-applications__card" key={id} aria-busy={updatingId === id}>
                    <div className="cf-applications__card-header">
                        <div className="cf-applications__header-content">
                            <h2 className="cf-applications__name">{config.name(row)}</h2>
                            <div className="cf-applications__contact">
                                <a href={mailto}>
                                    <i className="fa-regular fa-envelope" aria-hidden="true" />
                                    {row.email}
                                </a>
                                {row.phone && (
                                    <a href={`tel:${row.phone.replace(/[^+\d]/g, "")}`}>
                                        <i className="fa-solid fa-phone" aria-hidden="true" />
                                        {row.phone}
                                    </a>
                                )}
                            </div>
                        </div>
                        <InboxStatus value={row.status} labels={config.labels} />
                    </div>
                    <p className="cf-applications__date">
                        <i className="fa-regular fa-calendar" aria-hidden="true" />
                        {shortMoment(row.created_at)}
                    </p>
                    {config.subject && (
                        <p className="cf-applications__subject">
                            <strong>Asunto: </strong>{row.subject}
                        </p>
                    )}
                    <details className="cf-applications__details">
                        <summary>{config.detailsLabel}</summary>
                        <div className="cf-applications__details-content">
                            {config.fields.map((field) => (
                                <div key={field.key}>
                                    <strong>{field.label}</strong>
                                    <p>
                                        {row[field.key] || "No indicado"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </details>
                    <div className="cf-applications__actions">
                        {config.actions.filter((action) => action.status !== row.status).map((action) => (
                            <button
                                key={action.status}
                                type="button"
                                className={`cf-dash-btn cf-dash-btn--sm${action.ghost ? " cf-dash-btn--ghost" : ""}`}
                                disabled={busy}
                                onClick={() => onStatusChange(id, action.status)}
                            >
                                <i className={`fa-solid ${action.icon}`} aria-hidden="true" />
                                {action.label}
                            </button>
                        ))}
                        {updatingId === id && <span role="status">Guardando…</span>}
                    </div>
                </article>
            );
        })}
    </div>
);

export const Inbox = ({ config }) => {
    const { store, dispatch } = useGlobalReducer();
    const [rows, setRows] = useState([]);
    const [filter, setFilter] = useState("new");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const mounted = useRef(false);
    const requestId = useRef(0);
    const updating = useRef(false);

    const load = useCallback(async () => {
        if (updating.current) return;
        const request = ++requestId.current;
        setLoading(true);
        setError("");
        try {
            const result = await config.getItems(store.token);
            // Una respuesta vieja no debe reemplazar otra más reciente.
            if (!mounted.current || request !== requestId.current) return;
            if (result.status === 401) {
                dispatch({ type: "LOGOUT" });
                return;
            }
            if (result.ok && Array.isArray(result.data)) {
                setRows(newestFirst(result.data));
            } else {
                setError(result.data?.message || result.data?.error || config.loadError);
            }
        } catch {
            if (mounted.current && request === requestId.current) setError(config.loadError);
        } finally {
            if (mounted.current && request === requestId.current) setLoading(false);
        }
    }, [config, store.token, dispatch]);

    useEffect(() => {
        mounted.current = true;
        load();
        return () => {
            mounted.current = false;
            requestId.current += 1;
        };
    }, [load]);

    const changeStatus = async (id, status) => {
        // Evita dobles envíos y que Actualizar pise una modificación en curso.
        if (updating.current || loading) return;
        updating.current = true;
        const request = requestId.current;
        setUpdatingId(id);
        setError("");
        try {
            const result = await config.updateItem(id, status, store.token);
            if (!mounted.current || request !== requestId.current) return;
            if (result.status === 401) {
                dispatch({ type: "LOGOUT" });
                return;
            }
            const updated = result.data?.[config.responseKey];
            if (result.ok && updated?.[config.idKey] === id) {
                setRows((current) => current.map((row) => row[config.idKey] === id ? updated : row));
            } else {
                setError(result.data?.message || result.data?.error || config.updateError);
            }
        } catch {
            if (mounted.current && request === requestId.current) setError(config.updateError);
        } finally {
            updating.current = false;
            if (mounted.current) setUpdatingId(null);
        }
    };

    const filtered = rows.filter((row) => row.status === filter);
    const busy = loading || updatingId !== null;

    return (
        <section className="cf-applications">
            <header className="cf-applications__header">
                <div>
                    <p className="cf-dash-eyebrow">{config.eyebrow}</p>
                    <h1 className="cf-applications__title">{config.title}</h1>
                    <p className="cf-applications__lede">{config.description}</p>
                </div>
                <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={load} disabled={busy}>
                    <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                    Actualizar
                </button>
            </header>
            <InboxFilters filters={config.filters} rows={rows} value={filter} onChange={setFilter} label={config.filterLabel} />
            {error && (
                <div className="cf-dash-alert cf-applications__alert" role="alert">
                    <p>{error}</p>
                    <button type="button" className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm" onClick={load} disabled={busy}>
                        Reintentar
                    </button>
                </div>
            )}
            {loading ? (
                <div className="cf-applications__list" aria-busy="true">
                    <p className="sr-only" role="status">{config.loadingText}</p>
                    {Array.from({ length: 3 }, (_, index) => (
                        <div className="cf-applications__card" key={index} aria-hidden="true">
                            <span className="cf-dash-skel cf-applications__skel-name" />
                            <span className="cf-dash-skel cf-applications__skel-text" />
                            <span className="cf-dash-skel cf-applications__skel-text" />
                        </div>
                    ))}
                </div>
            ) : filtered.length ? (
                <InboxList rows={filtered} config={config} busy={busy} updatingId={updatingId} onStatusChange={changeStatus} />
            ) : !error ? (
                <div className="cf-dash-state" role="status">
                    <span className="cf-dash-state__icon">
                        <i className="fa-regular fa-folder-open" aria-hidden="true" />
                    </span>
                    <h2 className="cf-dash-state__title">{config.emptyTitle}</h2>
                    <p className="cf-dash-state__text">{config.emptyText}</p>
                </div>
            ) : null}
        </section>
    );
};
