/**
 * ESTADO GLOBAL DE LA APLICACIÓN.
 *
 * Guarda dos cosas independientes:
 *   - La sesión (`token` y `user`): sidebar, guardianes de rutas y dashboard.
 *   - El catálogo (`services`): navbar, footer y landing.
 *
 * Dos principios:
 *
 * 1. Carga síncrona: la sesión se restaura de `localStorage` al arrancar,
 *    para que los guardianes conozcan el rol antes del primer render y no
 *    haya redirecciones falsas al recargar con F5.
 *
 * 2. Fuente única: toda escritura en `localStorage` ocurre aquí, nunca en
 *    los componentes, para que disco y estado no se desincronicen.
 *
 * Se conecta a la app en hooks/useGlobalReducer.jsx (useReducer + context).
 */

/**
 * Estado inicial: se ejecuta una vez, al arrancar. Recupera la sesión que
 * quedó guardada de la última visita.
 */
export const initialStore = () => {
  let user = null;

  try {
    // localStorage solo guarda texto: hay que reconstruir el objeto.
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    // Si el valor está corrupto, JSON.parse lanza y la aplicación no
    // llegaría ni a arrancar: pantalla en blanco y sin pistas. Se descarta
    // el dato malo y se sigue sin sesión; ProtectedRoutes la recuperará si
    // el token todavía vale.
    user = null;
    localStorage.removeItem("user");
  }

  return {
    // || null: getItem ya devuelve null si no existe, pero así queda
    // explícito que la ausencia de token es null y no "".
    token: localStorage.getItem("token") || null,
    user,

    // El catálogo NO se guarda en localStorage, a diferencia de la sesión:
    // son datos públicos que cambian en el servidor, y guardarlos en disco
    // es la mejor forma de enseñar un catálogo viejo. Lo rellena
    // ServicesLoader al arrancar.
    services: [],
  };
};

/**
 * Reducer: recibe el estado actual y una acción, y devuelve el estado
 * nuevo. Es el único sitio donde cambia el estado global.
 *
 * Nunca modifica el objeto que recibe: crea uno nuevo con el spread. React
 * compara referencias, así que mutando el original no se enteraría y no
 * repintaría.
 */
export default function storeReducer(store, action = {}) {
  switch (action.type) {

    // Login correcto: token y usuario llegan juntos desde /api/login.
    case "LOGIN": {
      const { token, user } = action.payload;

      localStorage.setItem("token", token);
      // JSON.stringify porque localStorage no guarda objetos, solo texto.
      localStorage.setItem("user", JSON.stringify(user));

      return {
        ...store,
        token,
        user,
      };
    }

    // Cerrar sesión: se limpian las dos copias, disco y store. Ojo: no
    // invalida el token en el servidor (un JWT no se puede revocar), solo
    // se deja de usar.
    case "LOGOUT":
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      return {
        ...store,
        token: null,
        user: null,
      };

    // Refresca el usuario sin tocar el token. Lo usa la revalidación de
    // ProtectedRoutes para traer el rol actualizado si cambió en la BD.
    case "SET_USER":
      localStorage.setItem("user", JSON.stringify(action.payload));

      return {
        ...store,
        user: action.payload,
      };

    // Catálogo recibido del backend. Aquí NO hay setItem, a propósito:
    // ver el comentario de `services` en initialStore().
    case "SET_SERVICES":
      return {
        ...store,
        services: action.payload,
      }

    // Acción desconocida: se avisa por consola para cazar erratas, pero NO
    // se lanza. Un reducer que lanza tumba la aplicación entera: React
    // desmonta todo el árbol y solo se recupera con F5.
    default:
      console.warn(`Acción desconocida en el store: "${action.type}"`);
      return store;
  }
}
