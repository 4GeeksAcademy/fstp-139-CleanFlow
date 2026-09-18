/**
 * AVATAR: LA FOTO DE PERFIL, O LAS INICIALES (#13).
 *
 * Con foto la pinta; sin foto, un círculo con las iniciales. La regla vive
 * aquí y en un solo sitio, porque el avatar sale en los ajustes y en el
 * bloque de usuario del sidebar.
 *
 *   user: el usuario del store o los datos de la cuenta (name, last_name, avatar_url)
 *   size: "sm" | "md" | "lg"   ·   alt: texto si la foto dice algo por sí sola
 *
 * Estilos: dashboard.css (cf-dash-avatar*), en el paso 13.
 */

// Tamaño en píxeles de cada talla. Va en los atributos width y height de la
// imagen: sin ellos, y hasta que exista el CSS, la foto saldría a su tamaño
// real (256px) y reventaría el sidebar. El CSS del paso 13 manda sobre esto.
const SIZES = { sm: 32, md: 48, lg: 96 }

/** "Mateo Restrepo" -> "MR". Sin apellidos, una sola letra. */
export const initialsOf = (user) => {
    const first = (user?.name || "").trim().charAt(0)
    const second = (user?.last_name || "").trim().charAt(0)

    return (first + second).toUpperCase()
}

export const Avatar = ({ user, size = "md", alt = "" }) => {
    const className = `cf-dash-avatar cf-dash-avatar--${size}`
    const pixels = SIZES[size] || SIZES.md

    if (user?.avatar_url) {
        // alt vacío por defecto: al lado casi siempre está el nombre, y
        // repetirlo solo molesta a quien usa lector de pantalla.
        return <img className={className} src={user.avatar_url} alt={alt} width={pixels} height={pixels} />
    }

    // aria-hidden: las iniciales son un dibujo, no un texto que aporte.
    return (
        <span className={className} aria-hidden="true">
            {initialsOf(user)}
        </span>
    )
}