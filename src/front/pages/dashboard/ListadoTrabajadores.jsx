import { useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useNavigate } from "react-router-dom";
import { getWorkers } from "../../services/workerService";

export const ListadoTrabajadores = () => {
    const { store } = useGlobalReducer();
    const navigate = useNavigate();

    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");



    const loadWorkers = async () => {
        setLoading(true);
        setError("");

        const result = await getWorkers(store.token);

        if (result.ok) {
            setWorkers(result.data.workers);
        } else {
            setError(result.error || "No se han podido cargar los trabajadores");
        }

        setLoading(false);
    };

    useEffect(() => {
        if (store.token) {
            loadWorkers();
        }
    }, [store.token]);



    const handleEdit = (worker) => {
        navigate(`/dashboard/workers/${worker.worker_id}/edit`);
    };

    const handleNewWorker = () => {
        navigate("/dashboard/workers/new");
    };



    const managers = workers.filter(
        (worker) => worker.role === "manager"
    );

    const regularWorkers = workers.filter(
        (worker) => worker.role === "worker"
    );

    const renderWorkerRow = (worker) => (
        <tr key={worker.worker_id}>
            <td>
                {worker.name} {worker.last_name}
            </td>

            <td>
                {worker.position || "Sin puesto"}
            </td>

            <td>
                {worker.shift_name || "Sin turno"}
            </td>

            <td>
                {worker.is_active ? (
                    <span className="text-success fw-bold">
                        Activo
                    </span>
                ) : (
                    <span className="text-danger fw-bold">
                        Inactivo
                    </span>
                )}
            </td>

            <td>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleEdit(worker)}
                >
                    Editar
                </button>
            </td>
        </tr>
    );

    if (loading) {
        return (
            <div className="container mt-4">
                <h1>Gestión de personal</h1>
                <p>Cargando trabajadores...</p>
            </div>
        );
    }

    return (
        <div className="container mt-4 mb-5">

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1>Gestión de personal</h1>
                    <p className="text-muted mb-0">
                        Gestiona encargados y trabajadores.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleNewWorker}
                >
                    Añadir nuevo trabajador
                </button>
            </div>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            {/* ========================= */}
            {/* TABLA DE ENCARGADOS */}
            {/* ========================= */}

            <div className="card mb-5">
                <div className="card-header">
                    <h2 className="h4 mb-0">
                        Encargados
                    </h2>
                </div>

                <div className="card-body">

                    {managers.length === 0 ? (
                        <p className="text-muted mb-0">
                            No hay encargados registrados.
                        </p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Puesto</th>
                                        <th>Turno</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {managers.map(renderWorkerRow)}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>
            </div>

            {/* ========================= */}
            {/* TABLA DE TRABAJADORES */}
            {/* ========================= */}

            <div className="card">
                <div className="card-header">
                    <h2 className="h4 mb-0">
                        Trabajadores
                    </h2>
                </div>

                <div className="card-body">

                    {regularWorkers.length === 0 ? (
                        <p className="text-muted mb-0">
                            No hay trabajadores registrados.
                        </p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Puesto</th>
                                        <th>Turno</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {regularWorkers.map(renderWorkerRow)}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>
            </div>


        </div>
    );

};
