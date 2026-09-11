import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";


export const Register = () => {
    const navigate = useNavigate();


    const [formData, setFormData] = useState({
        name: "",
        last_name: "",
        email: "",
        phone: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const handleChange = (event) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading) return;

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const response = await fetch(
                import.meta.env.VITE_BACKEND_URL + "/api/register",
                {
                    method: "POST",
                    headers: {
                        "content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                }
            );
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "No se pudo completar el registro");
                return;
            }

            setSuccess("¡Tu cuenta se ha creado correctamente!");
            setFormData({
                name: "",
                last_name: "",
                email: "",
                phone: "",
                password: "",

            });

            setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch {
            setError(
                "No se pudo completar la solicitud. Comprueba tu conexión e inténtalo de nuevo."
            );
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="auth-card">
            <h1 className="auth-title">Crear cuenta</h1>

            <p className="auth-subtitle">
                Regístrate para solicitar y gestionar tus servicios
            </p>

            {error && (
                <div className="auth-alert" role="alert">
                    {error}
                </div>
            )}

            {success && (
                <div className="auth-notice" role="status">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="auth-field">
                    <label htmlFor="name" className="auth-label">
                        Nombre
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        className="auth-input"
                        placeholder="Tu nombre"
                        autoComplete="given-name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="last_name" className="auth-label">
                        Apellidos
                    </label>
                    <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        className="auth-input"
                        placeholder="Tus apellidos"
                        autoComplete="family-name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="email" className="auth-label">
                        Correo electrónico
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        className="auth-input"
                        placeholder="tucorreo@ejemplo.com"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="phone" className="auth-label">
                        Teléfono
                    </label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className="auth-input"
                        placeholder="600 123 456"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="password" className="auth-label">
                        Contraseña
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        className="auth-input"
                        placeholder="Mínimo 6 caracteres"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                    />
                </div>

                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? "Creando cuenta..." : "Crear cuenta"}
                </button>
            </form>

            <p className="auth-foot">
                ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
        </div>
    );
};