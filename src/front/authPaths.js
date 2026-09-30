/**
 * POR DÓNDE SE ENTRA Y A DÓNDE SE VUELVE (WEB-10).
 *
 * Hay dos accesos y los dos autentican igual, pero no ofrecen lo mismo a
 * quien no tiene cuenta: al cliente, registrarse; al equipo, la
 * candidatura. Por eso, al salir o al caducar la sesión, cada uno vuelve
 * a la suya.
 *
 * Y aquí vive también la vuelta: a dónde iba quien se topó con el login.
 *
 * Todo junto para que las reglas estén escritas una vez y no repartidas
 * por las tres pantallas que entran (login, registro y Google).
 */

export const LOGIN_CLIENTS = "/login-clients";
export const LOGIN_WORKERS = "/login-workers";

/**
 * La puerta del rol. Sin rol (sesión ya limpiada o datos raros) se
 * devuelve la de clientes: es la pública, la que puede usar cualquiera.
 */
export const loginPathForRole = (role) =>
    role === "worker" || role === "manager" ? LOGIN_WORKERS : LOGIN_CLIENTS;

/** Donde aterriza quien entra sin venir de ninguna parte. */
export const HOME_AFTER_LOGIN = "/dashboard";

/**
 * A dónde volver después de entrar.
 *
 * ProtectedRoutes guarda en `location.state.from` la ruta que el usuario
 * intentaba abrir. Hay que devolverla ENTERA: `pathname` es solo la ruta,
 * y sin `search` se pierde todo lo que va después del "?".
 *
 * Eso es lo que hacía que "Contratar" acabase en la pantalla correcta
 * pero sin el servicio elegido, porque el slug viaja en ?servicio=.
 */
export const returnPath = (from) =>
    from?.pathname ? `${from.pathname}${from.search || ""}` : HOME_AFTER_LOGIN;
