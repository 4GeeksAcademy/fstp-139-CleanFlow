/**
 * Marco de las pantallas de autenticación: registro, login y el paso que
 * falta tras entrar con Google. Sin Navbar ni Footer públicos, a
 * propósito. El logo y el enlace inferior son los dos caminos de vuelta.
 *
 * Con la sesión ya abierta, esos dos caminos CIERRAN LA SESIÓN. Solo se
 * llega aquí con sesión desde /completar-perfil, y si se pudiera salir
 * sin cerrarla el usuario se quedaría con la cuenta a medias —entró con
 * Google y le falta el teléfono— dando vueltas por la web sin saberlo.
 */

import { Link, Outlet, useNavigate } from "react-router-dom"
import { Logo } from "../../components/Logo"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import "../../auth.css"

export const AuthLayout = () => {
    const { store, dispatch } = useGlobalReducer()
    const navigate = useNavigate()

    // Con token, la cuenta está a medio hacer: irse es dejarla.
    const inProgress = Boolean(store.token)

    const leave = (event) => {
        if (!inProgress) return

        event.preventDefault()

        // intentional: se va porque quiere, no porque el token caducara.
        // Sin esto, la próxima visita al login le diría que su sesión
        // había expirado, que no es lo que ha pasado.
        dispatch({ type: "LOGOUT", payload: { intentional: true } })

        navigate("/", { replace: true })
    }

    return (
        <div className="auth-screen">
            <Link
                to="/"
                className="auth-logo"
                aria-label="CleanFlow, volver al inicio"
                onClick={leave}
            >
                <Logo />
                <span className="auth-word"><b>CLEAN</b><span>FLOW</span></span>
            </Link>

            <Outlet />

            <Link to="/" className="auth-back" onClick={leave}>
                {inProgress ? "← Salir y volver al inicio" : "← Volver al inicio"}
            </Link>
        </div>
    )
}
