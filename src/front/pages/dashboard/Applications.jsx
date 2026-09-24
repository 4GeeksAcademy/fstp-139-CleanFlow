import { useCallback, useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import {
    getJobApplications,
    updateApplicationStatus,
} from "../../services/applicationService";

const STATUS_LABELS = {
    new: "Nueva",
    contacted: "Contactada",
    discarded: "Descartada",
};

export const Applications = () => {
    const { store } = useGlobalReducer();

    const [applications, setApplications] = useState([]);
    const [filter, setFilter] = useState("new");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const loadApplications = useCallback(async () => {
        setLoading(true);
        setError("");

        const result = await getJobApplications(store.token);

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
    }, [store.token]);

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

        if (result.ok) {
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

    return (
        <div className="container py-3">
            <div className="d-flex justify-content-between flex-wrap gap-2 mb-4">
                <div>
                    <h1>Candidaturas recibidas</h1>
                    <p className="text-muted mb-0">
                        Gestiona las solicitudes enviadas desde Trabaja con nosotros.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-secondary align-self-center"
                    onClick={loadApplications}
                    disabled={loading}
                >
                    Actualizar
                </button>
            </div>

            <div className="mb-4">
                <label htmlFor="application-status-filter" className="form-label">
                    Filtrar por estado
                </label>

                <select
                    id="application-status-filter"
                    className="form-select"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                >
                    <option value="new">Nuevas</option>
                    <option value="contacted">Contactadas</option>
                    <option value="discarded">Descartadas</option>
                </select>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    <p className="mb-2">{error}</p>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={loadApplications}
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {loading ? (
                <p role="status">Cargando candidaturas…</p>
            ) : (
                !error && (
                    <>
                        {filteredApplications.length === 0 && (
                            <div className="alert alert-info">
                                No hay candidaturas en este estado. Las solicitudes
                                aparecen aquí cuando alguien completa el formulario
                                de “Trabaja con nosotros” de la web.
                            </div>
                        )}

                        {filteredApplications.map((application) => (
                            <article
                                key={application.application_id}
                                className="card p-4 mb-3"
                            >
                                <div className="d-flex justify-content-between flex-wrap gap-2">
                                    <div>
                                        <h2 className="h5 mb-1">
                                            {application.name} {application.last_name}
                                        </h2>

                                        <p className="mb-1">
                                            <a href={`mailto:${application.email}`}>
                                                {application.email}
                                            </a>
                                        </p>

                                        <p className="mb-2">
                                            <a href={`tel:${application.phone}`}>
                                                {application.phone}
                                            </a>
                                        </p>
                                    </div>

                                    <span className="badge text-bg-secondary align-self-start">
                                        {STATUS_LABELS[application.status] ||
                                            application.status}
                                    </span>
                                </div>

                                <p>
                                    <strong>Fecha:</strong>{" "}
                                    {application.created_at
                                        ? new Date(application.created_at).toLocaleString("es-ES")
                                        : "Sin fecha"}
                                </p>

                                <details className="mb-3">
                                    <summary>Ver experiencia y mensaje</summary>

                                    <div className="mt-3">
                                        <p>
                                            <strong>Experiencia:</strong>
                                        </p>
                                        <p style={{ whiteSpace: "pre-wrap" }}>
                                            {application.experience}
                                        </p>

                                        <p>
                                            <strong>Mensaje:</strong>
                                        </p>
                                        <p style={{ whiteSpace: "pre-wrap" }}>
                                            {application.message}
                                        </p>
                                    </div>
                                </details>

                                <div className="d-flex gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        className="btn btn-outline-success"
                                        disabled={updatingId === application.application_id}
                                        onClick={() =>
                                            handleStatusChange(
                                                application.application_id,
                                                "contacted"
                                            )
                                        }
                                    >
                                        Marcar como contactada
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-outline-danger"
                                        disabled={updatingId === application.application_id}
                                        onClick={() =>
                                            handleStatusChange(
                                                application.application_id,
                                                "discarded"
                                            )
                                        }
                                    >
                                        Descartar
                                    </button>
                                </div>
                            </article>
                        ))}
                    </>
                )
            )}
        </div>
    );
};