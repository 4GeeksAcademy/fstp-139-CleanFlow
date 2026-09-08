import { Link, Outlet } from "react-router-dom"
import { Logo } from "../../components/Logo"
import "../../auth.css"

// Layout de las pantallas de registro y de login: sin Navbar ni Footer
// públicos, a propósito. El logo y el enlace inferior son los dos
// caminos de vuelta al sitio público.
export const AuthLayout = () => {
    return (
        <div className="auth-screen">
            <Link to="/" className="auth-logo" aria-label="CleanFlow, volver al inicio">
                <Logo />
                <span className="auth-word"><b>CLEAN</b><span>FLOW</span></span>
            </Link>

            <Outlet />

            <Link to="/" className="auth-back">← Volver al inicio</Link>
        </div>
    )
}
