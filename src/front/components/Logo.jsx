// Isotipo de CleanFlow (escoba + ola) en SVG, recreado a partir del kit
// de marca. Usa currentColor: hereda el color del texto de su contenedor.
// De todas formas no deja de ser una propuesta que aún no se ha aceptado,
// por lo tanto se puede borrar.
export const Logo = ({ size = 72 }) => {
    return (
        <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
            <g fill="currentColor">
                <rect x="46" y="8" width="10" height="34" rx="4" />
                <path d="M34 42h34a5 5 0 0 1 5 5v7H29v-7a5 5 0 0 1 5-5z" />
                <path d="M30 56h6l-9 44a3 3 0 0 1-6 0zM40 56h6l-5 46a3 3 0 0 1-6 0zM50 56h6l-2 48a3 3 0 0 1-6 0zM60 56h6l2 46a3 3 0 0 1-6 0zM70 56h6l6 42a3 3 0 0 1-6 0z" />
            </g>
            <g fill="none" stroke="currentColor" strokeLinecap="round">
                <circle cx="86" cy="74" r="28" strokeWidth="7" pathLength="100" strokeDasharray="64 36" transform="rotate(-118 86 74)" />
                <circle cx="86" cy="74" r="18" strokeWidth="7" pathLength="100" strokeDasharray="62 38" transform="rotate(-118 86 74)" />
                <circle cx="86" cy="74" r="8" strokeWidth="6" pathLength="100" strokeDasharray="56 44" transform="rotate(-118 86 74)" />
            </g>
        </svg>
    )
}
