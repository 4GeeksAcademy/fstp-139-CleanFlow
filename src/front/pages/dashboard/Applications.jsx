/**
 * CANDIDATURAS (ENCARGADO).
 *
 * Muestra y gestiona las solicitudes recibidas desde "Trabaja con nosotros".
 * Permite filtrarlas por estado y actualizar su estado sin recargar la página.
 * No crea ni elimina candidaturas.
 *
 * API: services/applicationService.js · Estilos: dashboard.css (cf-applications__*).
 */

import { useCallback, useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import {
    getJobApplications,
    updateApplicationStatus,
} from "../../services/applicationService";
import "../../dashboard.css";

const STATUS_LABELS = {
    new: "Nueva",
    contacted: "Contactada",
    discarded: "Descartada",
};

const FILTERS = [
    { value: "new", label: "Nuevas" },
    { value: "contacted", label: "Contactadas" },
    { value: "discarded", label: "Descartadas" },
];

const SKELETON_ROWS = 3;

// La API devuelve la fecha en hora de Madrid sin zona horaria.
// Se muestra directamente para evitar que el navegador la desplace.
const shortMoment = (iso) =>
    iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)} · ${iso.slice(11, 16)}` : "Sin fecha";

export const Applications = () => {
    const { store, dispatch } = useGlobalReducer();

    const [applications, setApplications] = useState([]);
    const [filter, setFilter] = useState("new");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const loadApplications = useCallback(async () => {
        setLoading(true);
        setError("");

        const result = await getJobApplications(store.token);

        // Si la sesión ha caducado, ProtectedRoutes se ocupa de redirigir.
        if (result.status === 401) {
            setLoading(false);
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (result.ok) {
            setApplications(result.data);
        } else {
            setError(
                result.data?.message ||
                result.data?.error ||
                "No se pudieron cargar las candidaturas."
            );
        }

        setLoading(false);
    }, [store.token, dispatch]);

    useEffect(() => {
        loadApplications();
    }, [loadApplications]);

    const handleStatusChange = async (applicationId, status) => {
        setUpdatingId(applicationId);
        setError("");

        const result = await updateApplicationStatus(
            applicationId,
            status,
            store.token
        );

        if (result.status === 401) {
            setUpdatingId(null);
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (result.ok) {
            // Sustituimos solo la candidatura modificada con la que devuelve la API.
            setApplications((currentApplications) =>
                currentApplications.map((application) =>
                    application.application_id === applicationId
                        ? result.data.application
                        : application
                )
            );
        } else {
            setError(
                result.data?.message ||
                result.data?.error ||
                "No se pudo actualizar el estado de la candidatura."
            );
        }

        setUpdatingId(null);
    };

    const filteredApplications = applications.filter(
        (application) => application.status === filter
    );

    const countByStatus = (status) =>
        applications.filter((application) => application.status === status).length;

    return (
        <section className="cf-applications">
            <header className="cf-applications__header">
                <div>
                    <p className="cf-dash-eyebrow">Equipo</p>
                    <h1 className="cf-applications__title">Candidaturas recibidas</h1>
                    <p className="cf-applications__lede">
                        Gestiona las solicitudes enviadas desde Trabaja con nosotros.
                    </p>
                </div>

                <button
                    type="button"
                    className="cf-dash-btn cf-dash-btn--ghost"
                    onClick={loadApplications}
                    disabled={loading}
                >
                    <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                    Actualizar
                </button>
            </header>

            <div className="cf-services__tabs" aria-label="Filtrar candidaturas">
                {FILTERS.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        className="cf-services__tab"
                        aria-pressed={filter === item.value}
                        onClick={() => setFilter(item.value)}
                    >
                        {item.label}
                        <span className="cf-services__count">
                            {countByStatus(item.value)}
                        </span>
                    </button>
                ))}
            </div>

            {error && (
                <div className="cf-dash-alert cf-applications__alert" role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                        onClick={loadApplications}
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {loading ? (
                <div className="cf-applications__list" aria-busy="true">
                    <p className="sr-only">Cargando candidaturas...</p>

                    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                        <div className="cf-applications__card" key={index} aria-hidden="true">
                            <span className="cf-dash-skel cf-applications__skel-name" />
                            <span className="cf-dash-skel cf-applications__skel-text" />
                            <span className="cf-dash-skel cf-applications__skel-text" />
                        </div>
                    ))}
                </div>
            ) : (
                !error && (
                    <>
                        {filteredApplications.length === 0 ? (
                            <div className="cf-dash-state">
                                <i
                                    className="fa-regular fa-folder-open cf-dash-state__icon"
                                    aria-hidden="true"
                                />
                                <h2 className="cf-dash-state__title">
                                    No hay candidaturas en este estado
                                </h2>
                                <p className="cf-dash-state__text">
                                    Las solicitudes aparecen aquí cuando alguien completa
                                    el formulario de Trabaja con nosotros.
                                </p>
                            </div>
                        ) : (
                            <div className="cf-applications__list">
                                {filteredApplications.map((application) => (
                                    <article
                                        key={application.application_id}
                                        className="cf-applications__card"
                                    >
                                        <div className="cf-applications__card-header">
                                            <div>
                                                <h2 className="cf-applications__name">
                                                    {application.name} {application.last_name}
                                                </h2>

                                                <div className="cf-applications__contact">
                                                    <a href={`mailto:${application.email}`}>
                                                        <i
                                                            className="fa-regular fa-envelope"
                                                            aria-hidden="true"
                                                        />
                                                        {application.email}
                                                    </a>

                                                    <a href={`tel:${application.phone}`}>
                                                        <i
                                                            className="fa-solid fa-phone"
                                                            aria-hidden="true"
                                                        />
                                                        {application.phone}
                                                    </a>
                                                </div>
                                            </div>

                                            <span
                                                className={`cf-applications__state cf-applications__state--${application.status}`}
                                            >
                                                <span
                                                    className="cf-applications__dot"
                                                    aria-hidden="true"
                                                />
                                                <i
                                                    className={
                                                        application.status === "new"
                                                            ? "fa-regular fa-envelope"
                                                            : application.status === "contacted"
                                                                ? "fa-solid fa-check"
                                                                : "fa-solid fa-xmark"
                                                    }
                                                    aria-hidden="true"
                                                />
                                                {STATUS_LABELS[application.status] ||
                                                    application.status}
                                            </span>
                                        </div>

                                        <p className="cf-applications__date">
                                            <i
                                                className="fa-regular fa-calendar"
                                                aria-hidden="true"
                                            />
                                            {shortMoment(application.created_at)}
                                        </p>

                                        <details className="cf-applications__details">
                                            <summary>Ver experiencia y mensaje</summary>

                                            <div className="cf-applications__details-content">
                                                <div>
                                                    <strong>Experiencia</strong>
                                                    <p>{application.experience}</p>
                                                </div>

                                                <div>
                                                    <strong>Mensaje</strong>
                                                    <p>{application.message}</p>
                                                </div>
                                            </div>
                                        </details>

                                        <div className="cf-applications__actions">
                                            {application.status !== "contacted" && (
                                                <button
                                                    type="button"
                                                    className="cf-dash-btn cf-dash-btn--sm"
                                                    disabled={
                                                        updatingId === application.application_id
                                                    }
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            application.application_id,
                                                            "contacted"
                                                        )
                                                    }
                                                >
                                                    <i
                                                        className="fa-solid fa-phone"
                                                        aria-hidden="true"
                                                    />
                                                    Ya la he llamado
                                                </button>
                                            )}

                                            {application.status !== "discarded" && (
                                                <button
                                                    type="button"
                                                    className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                                                    disabled={
                                                        updatingId === application.application_id
                                                    }
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            application.application_id,
                                                            "discarded"
                                                        )
                                                    }
                                                >
                                                    <i
                                                        className="fa-solid fa-xmark"
                                                        aria-hidden="true"
                                                    />
                                                    Descartar
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </>
                )
            )}
        </section>
    );
};