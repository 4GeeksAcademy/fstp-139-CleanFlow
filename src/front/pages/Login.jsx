import React, { useState } from "react";
import { Link } from "react-router-dom";


export const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
    }

    return (
        <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
            <div className="card shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
                <div className="card-body p-4">
                    <h1 className="h3 text-center mb-4">Iniciar sesión</h1>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">Correo electrónico</label>
                            <input type="email" className="form-control" id="email" placeholder="tucorreo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="password" className="form-label">Contraseña</label>
                            <input type="password" className="form-control" id="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-primary w-100">Iniciar sesión</button>
                    </form>
                    <p className="text-center mt-3 mb-0">
                        ¿No tienes una cuenta? <Link to="/signup">Regístrate</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
