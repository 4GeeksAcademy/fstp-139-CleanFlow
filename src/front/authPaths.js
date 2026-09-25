/**
 * A QUÉ PUERTA VUELVE CADA ROL (WEB-10).
 *
 * Hay dos accesos y los dos autentican igual, pero no ofrecen lo mismo a
 * quien no tiene cuenta: al cliente, registrarse; al equipo, la
 * candidatura. Por eso, al salir o al caducar la sesión, cada uno vuelve
 * a la suya.
 *
 * Vive aquí y no en cada pantalla para que la regla esté escrita una vez.
 */

export const LOGIN_CLIENTS = "/login-clients";
export const LOGIN_WORKERS = "/login-workers";

/**
 * La puerta del rol. Sin rol (sesión ya limpiada o datos raros) se
 * devuelve la de clientes: es la pública, la que puede usar cualquiera.
 */
export const loginPathForRole = (role) =>
    role === "worker" || role === "manager" ? LOGIN_WORKERS : LOGIN_CLIENTS;
