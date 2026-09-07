import { Outlet } from "react-router-dom"
import ScrollToTop from "../../components/web/ScrollToTop"
import { Navbar } from "../../components/web/Navbar"
import { Footer } from "../../components/web/Footer"
import "../../web.css"

// Base component that maintains the navbar and footer throughout the page and the scroll to top functionality.
export const PublicLayout = () => {
    return (
        <ScrollToTop>
            <Navbar />
            <Outlet />
            <Footer />
        </ScrollToTop>
    )
}