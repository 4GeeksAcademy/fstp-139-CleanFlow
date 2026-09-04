"""
Modelos de base de datos de CleanFlow.

De momento solo existe `User`, que es la pieza sobre la que se apoyan
el login (contraseña) y todo el sistema de permisos (rol).
"""

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from flask_bcrypt import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """Usuario de la aplicación.

    Un único modelo para los tres tipos de usuario: lo que distingue a un
    cliente de un trabajador o un encargado es solo el campo `role`.
    """

    # ------------------------------------------------------------------
    # COLUMNAS
    # ------------------------------------------------------------------

    user_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)

    # Guarda el HASH de la contraseña, nunca la contraseña. Ver más abajo.
    password_hash: Mapped[str] = mapped_column(nullable=False)

    # Enum: la BD solo acepta estos tres valores. Un rol inventado no entra
    # ni por el admin ni por código. El `name` es la etiqueta que PostgreSQL
    # le pone internamente al tipo, y es obligatorio.
    role: Mapped[str] = mapped_column(
        Enum("client", "worker", "manager", name="user_role"),
        nullable=False
    )

    # Permite desactivar una cuenta sin borrarla (se conserva su historial).
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # server_default: la fecha la pone la BASE DE DATOS al insertar, no
    # Python. Así todos los registros usan el mismo reloj.
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(),
        nullable=False,
        server_default=func.now()
    )

    # ------------------------------------------------------------------
    # CONTRASEÑA
    #
    # La contraseña en claro no se guarda en ningún sitio. Se guarda su
    # hash: un resultado del que no se puede volver atrás. Por eso al
    # iniciar sesión no se compara "la contraseña", se vuelve a calcular
    # el hash y se comparan los dos hashes.
    # ------------------------------------------------------------------

    def set_password(self, password):
        """Hashea la contraseña y la guarda. Único sitio donde se escribe
        `password_hash`: todo alta de usuario debe pasar por aquí."""
        # bcrypt devuelve bytes; .decode() lo pasa a texto para la columna.
        self.password_hash = generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """Devuelve True si la contraseña recibida coincide con el hash."""
        try:
            return check_password_hash(self.password_hash, password)
        except ValueError:
            # El hash guardado no es un hash válido de bcrypt (pasa con los
            # usuarios creados desde el panel de admin, que escribe el campo
            # tal cual). Sin este except, bcrypt lanzaría y el login
            # respondería 500 en vez de un 401 normal.
            return False

    # ------------------------------------------------------------------
    # SERIALIZADORES
    #
    # Un modelo no tiene una única representación en JSON, sino una por
    # cada uso. Por eso hay dos métodos y no uno con condicionales.
    # ------------------------------------------------------------------

    def serialize(self):
        """Vista completa. Para pantallas de gestión (listados de admin,
        ficha de un trabajador...)."""
        return {
            "user_id": self.user_id,
            "name": self.name,
            "last_name": self.last_name,
            "phone": self.phone,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "avatar_url": self.avatar_url,
            # isoformat() convierte la fecha a texto, porque JSON no
            # entiende de fechas. El `if` evita reventar si aún no existe.
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def serialize_session(self):
        """Vista mínima para la sesión del frontend: solo lo justo para
        decidir rutas y pintar el sidebar.

        Es lo que devuelven /api/login y /api/profile, y lo que acaba
        guardado en localStorage — de ahí que vaya lo imprescindible.
        """
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url
        }
