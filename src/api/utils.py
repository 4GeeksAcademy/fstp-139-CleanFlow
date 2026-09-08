"""
Utilidades compartidas del backend de CleanFlow.

Contiene tres cosas independientes entre sí:
  - APIException:      errores controlados que se devuelven como JSON.
  - generate_sitemap:  página de bienvenida de la API (de la plantilla).
  - role_required:     el decorador que protege endpoints por rol.
"""

from functools import wraps
from flask import jsonify, url_for
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity


# ----------------------------------------------------------------------
# ERRORES CONTROLADOS
# ----------------------------------------------------------------------

class APIException(Exception):
    """Error previsto de la API, que se convierte en una respuesta JSON.

    En lugar de devolver un jsonify con su código en cada sitio, se lanza
    esta excepción y app.py la recoge (@app.errorhandler) y la traduce a
    una respuesta con su mensaje y su código. Así el error puede nacer en
    cualquier función, aunque esté lejos de la vista.
    """

    # Código por defecto si no se indica otro al lanzarla.
    status_code = 400

    def __init__(self, message, status_code=None, payload=None):
        Exception.__init__(self)
        self.message = message
        # Solo se pisa el 400 por defecto si se pasa un código expreso.
        if status_code is not None:
            self.status_code = status_code
        # Datos extra opcionales para acompañar al mensaje.
        self.payload = payload

    def to_dict(self):
        """Prepara el cuerpo de la respuesta: el payload (si lo hay) más
        el mensaje. Es lo que app.py convierte en JSON."""
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv


# ----------------------------------------------------------------------
# PÁGINA DE BIENVENIDA DE LA API
#
# Código de la plantilla de 4Geeks. Pinta en la raíz del backend un
# listado con todos los endpoints disponibles, solo en desarrollo.
# ----------------------------------------------------------------------

def has_no_empty_params(rule):
    """Indica si una ruta se puede abrir en el navegador tal cual, sin
    rellenar nada. Descarta las que llevan parámetros en la URL (por
    ejemplo /single/<id>), porque no se puede generar su enlace."""
    defaults = rule.defaults if rule.defaults is not None else ()
    arguments = rule.arguments if rule.arguments is not None else ()
    return len(defaults) >= len(arguments)


def generate_sitemap(app):
    """Devuelve el HTML con la lista de endpoints de la API."""
    links = ['/admin/']
    for rule in app.url_map.iter_rules():
        # Nos quedamos solo con las rutas que se pueden visitar desde el
        # navegador: las que responden a GET y no piden parámetros.
        if "GET" in rule.methods and has_no_empty_params(rule):
            url = url_for(rule.endpoint, **(rule.defaults or {}))
            if "/admin/" not in url:
                links.append(url)

    links_html = "".join(["<li><a href='" + y + "'>" + y + "</a></li>" for y in links])
    return """
        <div style="text-align: center;">
        <img style="max-height: 80px" src='https://storage.googleapis.com/breathecode/boilerplates/rigo-baby.jpeg' />
        <h1>Rigo welcomes you to your API!!</h1>
        <p>API HOST: <script>document.write('<input style="padding: 5px; width: 300px" type="text" value="'+window.location.href+'" />');</script></p>
        <p>Start working on your project by following the <a href="https://start.4geeksacademy.com/starters/full-stack" target="_blank">Quick Start</a></p>
        <p>Remember to specify a real endpoint path like: </p>
        <ul style="text-align: left;">"""+links_html+"</ul></div>"


# ----------------------------------------------------------------------
# PERMISOS POR ROL
# ----------------------------------------------------------------------

def role_required(*roles):
    """Protege un endpoint dejando entrar solo a los roles indicados.

    Uso:  @role_required("manager")
          @role_required("manager", "worker")   # varios roles permitidos

    Comprueba el token por su cuenta: NO hay que apilarle @jwt_required()
    encima. Si el token falta o no vale, responde 401; si es válido pero
    el rol no encaja, 403.

    Esta es la única barrera real del sistema de roles: los guardianes
    del frontend se pueden saltar editando el navegador, este no.
    """
    # Tres funciones anidadas porque el decorador recibe argumentos:
    #   role_required("manager")  ->  devuelve decorator
    #   decorator(fn)             ->  envuelve tu función y devuelve wrapper
    #   wrapper(...)              ->  es lo que se ejecuta en cada petición
    def decorator(fn):
        # @wraps conserva el nombre real de la función. Sin él, Flask vería
        # que todas las vistas decoradas se llaman "wrapper" y fallaría al
        # registrar la segunda.
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Misma comprobación que hace @jwt_required() por dentro.
            # Si el token falta o es inválido, responde 401 y no sigue.
            verify_jwt_in_request()

            # Import aquí dentro y no arriba, para evitar un import
            # circular el día que models.py necesite algo de utils.py.
            from api.models import db, User
            user_id = get_jwt_identity()
            user = db.session.get(User, user_id)

            # Si el usuario ya no existe o su rol no está permitido, se
            # deniega. Nunca se consulta el rol que dice el frontend: se
            # lee de la base de datos en cada petición.
            if not user or user.role not in roles:
                return jsonify({"error": "You don't have permission to access this resource"}), 403

            # Permiso concedido: se ejecuta el endpoint de verdad.
            return fn(*args, **kwargs)
        return wrapper
    return decorator
