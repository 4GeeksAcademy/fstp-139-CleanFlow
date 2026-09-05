import { useEffect } from "react"
import useGlobalReducer from "../../hooks/useGlobalReducer"
import { getServices } from "../../services/serviceService"

const SERVICES_REFRESH_TIME = 5 * 60 * 1000

let lastRecharge = 0 

export const ServicesLoader = () => {
    const { dispatch } = useGlobalReducer()

    useEffect(() => {
        const loadServices = async () => {
            if(Date.now() - lastRecharge < SERVICES_REFRESH_TIME) return 

            lastRecharge = Date.now()

            const { ok, data } = await getServices()

            if (ok) {
                dispatch({ type: "SET_SERVICES", payload: data})
                return
            }

            console.warn("The service catalog could not be updated.")

            lastRecharge = 0

        }
        
        loadServices()

        const whenChangingView = () => {
            if (document.visibilityState == "visible") loadServices()
        }

        document.addEventListener("visibilitychange", whenChangingView)

        return () => {
            document.removeEventListener("visibilitychange", whenChangingView)
        }

    }, [dispatch])

    return null
}