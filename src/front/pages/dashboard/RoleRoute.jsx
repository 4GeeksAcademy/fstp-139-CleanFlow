import { Navigate, Outlet } from "react-router-dom"
import useGlobalReducer from "../../hooks/useGlobalReducer"

export const RoleRoute = ({ allowed = [] }) => {
    const { store } = useGlobalReducer()

    if (!allowed.includes(store.user?.role)) {
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}