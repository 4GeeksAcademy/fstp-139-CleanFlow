"""
Modelos de la base de datos de CleanFlow.

  - User: una sola tabla para cliente, trabajador y encargado (campo `role`).
  - Service y Task: los dos catálogos que gestiona el encargado (#11).
  - Booking y BookingTask: reservas, con precio, minutos y nombres congelados.
  - Shift, Worker, Address, Review, Incident, Media: resto del dominio.

Lo que tiene `is_active` no se borra: se desactiva.
"""

from datetime import time, datetime, date, timedelta
from zoneinfo import ZoneInfo
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Text, Float, Integer, Time, Date, DateTime, ForeignKey, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from enum import Enum
from flask_bcrypt import generate_password_hash, check_password_hash

db = SQLAlchemy()

# Las fechas se guardan en hora de Madrid y sin zona. Aquí solo se usa
# para saber si un servicio es hoy; el resto del cálculo vive en
# availability.py, que no se importa para no cruzar los dos módulos.
MADRID = ZoneInfo("Europe/Madrid")


# Días que tiene el cliente para responder antes de que el servicio se dé
# por bueno solo (#83). El front lo repite en bookingFormat.js para pintar
# el plazo; quien manda es este.
CONFIRM_DAYS = 3


# ==================================================================
# ENUMS
# ==================================================================

class BookingStatus(Enum):
    """El camino de una reserva, en orden:

    pending -> confirmed -> in_progress -> completed

    Y dos salidas: cancelled (antes de empezar) y not_done (el trabajador
    llegó pero no se pudo hacer, por ejemplo si el cliente no estaba).
    """
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NOT_DONE = "not_done"


class BookingTaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class MediaType(Enum):
    IMAGE = "image"
    VIDEO = "video"


class MediaKind(Enum):
    """Para qué es la foto.

    before / after: el antes y el después de una tarea, que el trabajador
    sube para cerrarla. incident: la prueba de una incidencia.
    """
    BEFORE = "before"
    AFTER = "after"
    INCIDENT = "incident"


class IncidentType(Enum):
    """De quién viene el problema.

    client: el cliente no está, no deja entrar, pide tareas de más...
    company: falta material, un daño, un retraso nuestro. También es lo
    que se usa cuando el cliente reclama el resultado del servicio.
    """
    CLIENT = "client"
    COMPANY = "company"


class IncidentSource(Enum):
    """Quién la abrió: el trabajador durante el servicio (#18) o el
    cliente al reclamar (#83)."""
    WORKER = "worker"
    CLIENT = "client"


class ApplicationStatus(Enum):
    NEW = "new"
    CONTACTED = "contacted"
    DISCARDED = "discarded"


# ==================================================================
# USER
# ==================================================================

class User(db.Model):
    """Usuario de la aplicación.

    Cliente, trabajador y encargado comparten modelo: solo los distingue `role`.
    """

    # Sin esto la tabla se llamaría "user" y las claves foráneas a "users"
    # no la encontrarían.
    __tablename__ = "users"

    # ------------------------------------------------------------------
    # COLUMNAS
    # ------------------------------------------------------------------

    user_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)

    # El hash, nunca la contraseña en claro (ver set_password).
    password_hash: Mapped[str] = mapped_column(nullable=False)

    # La BD solo acepta estos tres roles. `name` es el nombre del tipo en
    # PostgreSQL, y es obligatorio.
    role: Mapped[str] = mapped_column(
        SQLEnum("client", "worker", "manager", name="user_role"),
        nullable=False
    )

    # Desactivar en vez de borrar conserva el historial de la cuenta.
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # server_default: la fecha la pone la BD al insertar, no Python.
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(),
        nullable=False,
        server_default=func.now()
    )

    # ------------------------------------------------------------------
    # CONTRASEÑA
    # ------------------------------------------------------------------
    # Solo se guarda el hash, que no tiene vuelta atrás: al hacer login se
    # hashea lo recibido y se comparan los dos hashes.

    def set_password(self, password):
        """Hashea y guarda la contraseña. Todo alta de usuario pasa por aquí."""
        # bcrypt devuelve bytes; .decode() lo pasa a texto para la columna.
        self.password_hash = generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """True si la contraseña recibida coincide con el hash guardado."""
        try:
            return check_password_hash(self.password_hash, password)
        except ValueError:
            # Hash no válido de bcrypt (p. ej. usuario creado desde el panel
            # de admin). Sin esto el login daría 500 en vez de 401.
            return False

    # ------------------------------------------------------------------
    # SERIALIZADORES
    # ------------------------------------------------------------------
    # Un método por uso, en vez de uno lleno de condicionales.

    def serialize(self):
        """Vista completa, para pantallas de gestión."""
        return {
            "user_id": self.user_id,
            "name": self.name,
            "last_name": self.last_name,
            "phone": self.phone,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "avatar_url": self.avatar_url,
            # JSON no entiende de fechas: se envía como texto ISO.
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def serialize_session(self):
        """Vista mínima para la sesión. La devuelven /api/login y /api/profile
        y acaba en localStorage, así que solo lleva lo imprescindible.

        last_name está por el bloque de usuario del sidebar, que enseña el
        nombre completo. El teléfono NO: no hace falta para la sesión."""
        return {
            "user_id": self.user_id,
            "name": self.name,
            "last_name": self.last_name,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url
        }

    def serialize_account(self):
        """Vista para la pantalla de ajustes (#13). Añade el teléfono, que
        solo se usa ahí. El correo viaja, pero no se puede cambiar."""
        return {
            "name": self.name,
            "last_name": self.last_name,
            "phone": self.phone,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url
        }


# ==================================================================
# SHIFT
# ==================================================================
# Turno de trabajo (mañana, tarde...) con su hora de inicio y fin.

class Shift(db.Model):
    __tablename__ = "shifts"

    shift_id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    start_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    end_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    # Días de la semana en que se trabaja, como texto: "1,2,3,4,5".
    # Lunes = 1 ... domingo = 7, igual que date.isoweekday(): se compara
    # sin convertir nada. Se lee y se escribe con la propiedad `days`.
    work_days: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="1,2,3,4,5"
    )

    # Desactivado: se conserva, pero no ofrece huecos para reservar.
    # server_default: los turnos que ya existían quedan activos al migrar.
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False,
        default=True,
        server_default="true"
    )

    @property
    def days(self):
        """Los días como lista de números: "1,3,5" -> [1, 3, 5]."""
        return [int(day) for day in self.work_days.split(",") if day]

    @days.setter
    def days(self, values):
        """Guarda la lista ordenada y sin repetidos: [5, 1, 1] -> "1,5"."""
        self.work_days = ",".join(str(day) for day in sorted(set(values)))

    def serialize(self):
        return {
            "shift_id": self.shift_id,
            "name": self.name,
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "work_days": self.days,
            "is_active": self.is_active,
            "workers": [
                {
                    "worker_id": worker.worker_id,
                    "name": worker.user.name,
                    "last_name": worker.user.last_name,
                }
                for worker in self.workers
                if worker.user is not None
            ],
        }


# ==================================================================
# WORKER
# ==================================================================
# Ficha laboral de un usuario trabajador: turno, fecha de alta y puesto.

class Worker(db.Model):
    __tablename__ = "workers"

    worker_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"),
        unique=True,
        nullable=False
    )

    shift_id: Mapped[int | None] = mapped_column(
        ForeignKey("shifts.shift_id"),
        nullable=True
    )

    hire_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    position: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        default=True,
        nullable=False
    )

    user = db.relationship(
        "User",
        foreign_keys=[user_id],
        backref="worker",
        lazy=True
    )

    shift = db.relationship(
        "Shift",
        backref="workers",
        lazy=True
    )

    def serialize(self):
        return {
            "worker_id": self.worker_id,
            "user_id": self.user_id,
            "name": self.user.name if self.user else None,
            "last_name": self.user.last_name if self.user else None,
            "phone": self.user.phone if self.user else None,
            "email": self.user.email if self.user else None,
            "role": self.user.role if self.user else None,
            "shift_id": self.shift_id,
            "shift_name": self.shift.name if self.shift else None,
            "hire_date": (
                self.hire_date.isoformat()
                if self.hire_date
                else None
            ),
            "position": self.position,
            "is_active": self.is_active,
        }


# ==================================================================
# ADDRESS
# ==================================================================
# Dirección de un cliente donde se hace el servicio. Cada cliente tiene una
# principal (is_default), que es la que sale elegida al contratar.

class Address(db.Model):
    __tablename__ = "addresses"

    address_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"),
        nullable=False
    )
    street: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    number: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    # Opcionales: una casa no tiene piso, y las notas de acceso (portero,
    # timbre, dónde aparcar...) son un extra.
    floor: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )
    postal_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
    city: Mapped[str] = mapped_column(
        String(80),
        nullable=False
    )
    access_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # La principal del cliente: la que sale elegida al contratar. Solo puede
    # haber una activa, y de eso se encarga la API.
    is_default: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False,
        default=False
    )

    # Se desactiva, nunca se borra: hay reservas que apuntan a ella.
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False,
        default=True
    )

    # La pone la BD al insertar. Sirve para saber cuál es la más reciente
    # cuando hay que elegir principal nueva.
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    def serialize(self):
        """Sin client_id: el cliente solo recibe las suyas."""
        return {
            "address_id": self.address_id,
            "street": self.street,
            "number": self.number,
            "floor": self.floor,
            "postal_code": self.postal_code,
            "city": self.city,
            "access_notes": self.access_notes,
            "is_default": self.is_default,
            "is_active": self.is_active,
        }


# ==================================================================
# SERVICE
# ==================================================================

class Service(db.Model):
    """Tipo de limpieza (esencial, integral, profunda, fin de obra...), por horas.

    `minutes_per_task` vive aquí y no en Task porque la misma tarea dura
    distinto según el servicio.
    """

    __tablename__ = "services"

    # ------------------------------------------------------------------
    # IDENTIDAD Y TEXTOS
    # ------------------------------------------------------------------

    service_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    # URL pública ("limpieza-integral"). Se genera con slugify() al crear y
    # NO cambia al renombrar, para no romper enlaces ya compartidos.
    slug: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False
    )

    # Texto corto, para tarjetas y listados.
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    # Texto de la ficha. Opcional: sin él, la web usa `description`.
    long_description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    image_url: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    # ------------------------------------------------------------------
    # PRECIO Y TIEMPO
    # ------------------------------------------------------------------

    base_hourly_rate: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    # Minutos por tarea: 10, 12, 15, 20, 30 o 60 (divisores de 60, lo valida
    # la API). ⚠️ NULL significa que el servicio NO lleva tareas (fin de obra).
    minutes_per_task: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    # Horas contratables: mínimo, salto y tope opcional.
    #   esencial / integral / profunda:  mínimo 1, salto 1
    #   fin de obra:                     mínimo 6, salto 3  (6, 9, 12...)
    min_hours: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )
    hour_step: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )
    max_hours: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    # Se desactiva, nunca se borra: hay reservas que apuntan a él.
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False
    )

    # ------------------------------------------------------------------
    # DATOS CALCULADOS
    # ------------------------------------------------------------------

    @property
    def tasks_per_hour(self):
        """Tareas que caben en una hora (30 min -> 2), o None si no lleva tareas.
        Viaja en el JSON para que el frontend no repita la cuenta."""
        if self.minutes_per_task is None:
            return None
        return 60 // self.minutes_per_task

    # ------------------------------------------------------------------
    # SERIALIZADORES
    # ------------------------------------------------------------------
    # Como en User: la de gestión lo enseña todo; la pública, solo lo que
    # puede ver cualquiera.

    def serialize(self):
        """Vista completa, para el panel del encargado."""
        return {
            "service_id": self.service_id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "long_description": self.long_description,
            "image_url": self.image_url,
            "base_hourly_rate": self.base_hourly_rate,
            "minutes_per_task": self.minutes_per_task,
            "tasks_per_hour": self.tasks_per_hour,
            "min_hours": self.min_hours,
            "hour_step": self.hour_step,
            "max_hours": self.max_hours,
            "is_active": self.is_active,
        }

    def serialize_public(self):
        """Vista para la web y el cliente. Sin id ni `is_active`: solo llegan
        servicios activos y se identifican por slug."""
        return {
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "long_description": self.long_description,
            "image_url": self.image_url,
            "base_hourly_rate": self.base_hourly_rate,
            "minutes_per_task": self.minutes_per_task,
            "tasks_per_hour": self.tasks_per_hour,
            "min_hours": self.min_hours,
            "hour_step": self.hour_step,
            "max_hours": self.max_hours,
        }


# ==================================================================
# TASK
# ==================================================================

class Task(db.Model):
    """Tarea del catálogo compartido (limpiar cristales, baño...).

    Vale para cualquier servicio con tareas. No guarda minutos: eso depende
    del servicio (Service.minutes_per_task).
    """

    __tablename__ = "tasks"

    task_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    # Único en la BD. Que no se repita cambiando solo mayúsculas lo
    # comprueba la API.
    task_name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # Se desactiva, nunca se borra: hay reservas que apuntan a ella.
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False,
        default=True
    )

    # ------------------------------------------------------------------
    # SERIALIZADORES
    # ------------------------------------------------------------------
    # Como en Service: la de gestión lo enseña todo; la pública, sin estado.

    def serialize(self):
        """Vista completa, para el panel del encargado."""
        return {
            "task_id": self.task_id,
            "task_name": self.task_name,
            "description": self.description,
            "is_active": self.is_active,
        }

    def serialize_public(self):
        """Vista para la web y el cliente. Sin `is_active`: solo llegan tareas
        activas. Con `task_id`, a diferencia de Service: las tareas no tienen
        slug, y la reserva (#14) guardará las elegidas por su id."""
        return {
            "task_id": self.task_id,
            "task_name": self.task_name,
            "description": self.description,
        }


# ==================================================================
# BOOKING
# ==================================================================
# Reserva de un cliente: servicio, dirección, horario y precio.

class Booking(db.Model):
    __tablename__ = "bookings"

    booking_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"),
        nullable=False
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.service_id"),
        nullable=False
    )
    address_id: Mapped[int] = mapped_column(
        ForeignKey("addresses.address_id"),
        nullable=False
    )
    # Quién hace la reserva: lo elige el cliente (o se asigna solo con
    # "Cualquiera"). Por eso la reserva nace ya confirmada.
    worker_id: Mapped[int] = mapped_column(
        ForeignKey("workers.worker_id"),
        nullable=False,
        index=True
    )
    # Hora de Madrid, sin zona: inicio del primer tramo y fin del último.
    # Las horas contratadas no se guardan: salen de los tramos (hours).
    scheduled_start: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    scheduled_end: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    # Congelados al reservar (tarifa, minutos y total): si el servicio cambia
    # después, esta reserva conserva los suyos. El histórico no se reescribe.
    hourly_rate: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )
    minutes_per_task: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )
    total_price: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )
    status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(BookingStatus),
        nullable=False
    )
    client_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    # Cancelación empresarial: visible al cliente, sin exponer ausencias.
    cancelled_by_company: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    cancellation_reason: Mapped[str | None] = mapped_column(
        Text, nullable=True)

    # ---- LO QUE PASÓ DE VERDAD ----
    # scheduled_start y los tramos dicen lo previsto; esto, lo ocurrido.
    # Hora de Madrid sin zona, como el resto de fechas del proyecto.

    # Cuando el trabajador pulsó "Empezar" el primer día.
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True)

    # Cuando dio el servicio por terminado. De aquí salen los 3 días que
    # tiene el cliente para confirmar (#83).
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True)

    # Cuando el cliente confirmó que se hizo bien. Vacío no significa
    # "mal": puede estar aún en plazo o confirmarse solo (#83).
    client_confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True)

    # ---- RELACIONES ----
    # No añaden columnas: le dicen a SQLAlchemy cómo cruzar las claves.
    # Así se lee booking.service en vez de buscarlo.
    worker = db.relationship("Worker")
    service = db.relationship("Service")
    address = db.relationship("Address")

    # Quién contrató: el trabajador necesita saber a quién va a ver.
    client = db.relationship("User")

    # Los tramos, en orden. Con booking.days.append(...) se guardan
    # junto con la reserva.
    days = db.relationship(
        "BookingDay",
        order_by="BookingDay.starts_at"
    )

    # Las tareas en el orden en que se añadieron. Con
    # booking.tasks.append(...) se guardan junto con la reserva.
    tasks = db.relationship(
        "BookingTask",
        order_by="BookingTask.booking_task_id"
    )

    # Las incidencias de la reserva, de la más reciente a la más antigua.
    # Las lee el detalle del cliente (#16) y el del encargado.
    incidents = db.relationship(
        "Incident",
        order_by="Incident.created_at.desc()"
    )

    # ---- DATOS CALCULADOS ----

    @property
    def hours(self):
        """Horas contratadas: la suma de sus tramos.

        Fin menos inicio no vale: una reserva de viernes a lunes contaría
        también las noches y el fin de semana.
        """
        seconds = sum((day.ends_at - day.starts_at).total_seconds() for day in self.days)
        return int(seconds // 3600)

    
    @property
    def confirmation(self):
        """En qué punto está la respuesta del cliente (#83).

            in_review       reclamó y todavía se está mirando
            confirmed       dijo que sí
            auto_confirmed  no dijo nada y pasaron los 3 días
            pending         está en plazo y aún no ha respondido
            None            el servicio no ha llegado a finalizarse

        Se calcula al leer y no se guarda: una tarea programada para esto
        sería infraestructura que hay que vigilar, y con completed_at y la
        fecha de hoy sale solo.

        El orden de las comprobaciones importa. Una reclamación gana al
        plazo: si el cliente reclamó el día 2, el día 4 no puede aparecer
        como confirmada sola.
        """
        if self.status != BookingStatus.COMPLETED:
            return None

        reclamó = any(
            incident.source == IncidentSource.CLIENT and not incident.resolved
            for incident in self.incidents
        )

        if reclamó:
            return "in_review"

        if self.client_confirmed_at:
            return "confirmed"

        # Sin fecha de fin no hay plazo que contar: las reservas
        # anteriores a la #81 se finalizaron sin ella.
        if not self.completed_at:
            return "pending"

        limite = self.completed_at.date() + timedelta(days=CONFIRM_DAYS)

        return "pending" if datetime.now(MADRID).date() <= limite else "auto_confirmed"

    # ---- SERIALIZADORES ----

    def serialize(self):
        return {
            "booking_id": self.booking_id,
            "client_id": self.client_id,
            "service_id": self.service_id,
            "address_id": self.address_id,
            "worker_id": self.worker_id,
            "scheduled_start": (
                self.scheduled_start.isoformat()
                if self.scheduled_start
                else None
            ),
            "scheduled_end": (
                self.scheduled_end.isoformat()
                if self.scheduled_end
                else None
            ),
            "hourly_rate": self.hourly_rate,
            "minutes_per_task": self.minutes_per_task,
            "total_price": self.total_price,
            "status": (
                self.status.value
                if self.status
                else None
            ),
            "client_notes": self.client_notes,
            "cancelled_by_company": self.cancelled_by_company,
            "cancellation_reason": self.cancellation_reason,
            "worker_name": (
                self.worker.user.name + (
                    " " + self.worker.user.last_name.strip()[0] + "."
                    if self.worker.user.last_name.strip() else ""
                ) if self.worker and self.worker.user else None
            ),
            "days": [day.serialize() for day in self.days],
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            ),
        }

    def serialize_detail(self):
        """La reserva completa: servicio, dirección, tramos, tareas con sus
        fotos, e incidencias.

        La usan la confirmación del panel, "Mis reservas" del cliente (#16)
        y el seguimiento del trabajador (#82). Lo pesado (fotos e
        incidencias) va solo aquí: `serialize()` se queda ligera porque la
        usan las listas, como la de Reservas afectadas.
        """
        return {
            **self.serialize(),
            "hours": self.hours,
            "service": {
                "name": self.service.name,
                "slug": self.service.slug,
            },
            "address": self.address.serialize(),
            "days": [day.serialize() for day in self.days],
            "tasks": [task.serialize() for task in self.tasks],
            "incidents": [incident.serialize() for incident in self.incidents],
            # Los datos del cliente, para quien va a su casa. El nombre
            # siempre, con la inicial del apellido como el del trabajador.
            "client_name": (
                self.client.name + (
                    " " + self.client.last_name.strip()[0] + "."
                    if self.client.last_name.strip() else ""
                ) if self.client else None
            ),

            # El teléfono, solo el día del servicio: hace falta para avisar
            # de que se llega, no el resto del mes.
            "client_phone": (
                self.client.phone
                if self.client and any(
                    day.starts_at.date() == datetime.now(MADRID).date()
                    for day in self.days
                )
                else None
            ),

            # La foto del trabajador, solo aquí: el listado se apaña con
            # las iniciales y no tiene por qué cargar con ella.
            "worker_avatar_url": (
                self.worker.user.avatar_url
                if self.worker and self.worker.user
                else None
            ),

            # Lo que pasó de verdad, frente a lo previsto en scheduled_*.
            "started_at": (
                self.started_at.isoformat()
                if self.started_at
                else None
            ),
            "completed_at": (
                self.completed_at.isoformat()
                if self.completed_at
                else None
            ),
            # En qué punto está la respuesta del cliente (#83). Se calcula
            # al leer, así que no hace falta ninguna tarea programada.
            "confirmation": self.confirmation,
            
            "client_confirmed_at": (
                self.client_confirmed_at.isoformat()
                if self.client_confirmed_at
                else None
            ),
        }


# ==================================================================
# BOOKING DAY
# ==================================================================
# Los tramos de trabajo de una reserva: uno por día, de 8 h como mucho
# (3 h = un tramo; 12 h = dos). La disponibilidad mira estos tramos y no
# el inicio y fin de la reserva: entre dos puede caer un fin de semana.

class BookingDay(db.Model):
    __tablename__ = "booking_days"

    booking_day_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.booking_id"),
        nullable=False,
        index=True
    )
    # Hora de Madrid sin zona. starts_at/ends_at y no start/end: END es
    # palabra reservada de SQL.
    starts_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    ends_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    # Lo que pasó ese día. Un servicio de varios días se empieza y se
    # cierra cada día, así que las horas reales van aquí y no solo en la
    # reserva.
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True)

    def serialize(self):
        return {
            "booking_day_id": self.booking_day_id,
            "starts_at": self.starts_at.isoformat(),
            "ends_at": self.ends_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
        }


# ==================================================================
# BOOKING TASK
# ==================================================================

class BookingTask(db.Model):
    """Tarea dentro de una reserva. Cada repetición es una fila (tres
    habitaciones = tres filas con el mismo task_id), con su propio estado."""

    __tablename__ = "booking_tasks"

    booking_task_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.booking_id"),
        nullable=False
    )
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.task_id"),
        nullable=False
    )

    # Congelado al reservar: si se renombra la tarea, la reserva conserva
    # el nombre con el que se contrató.
    task_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    status: Mapped[BookingTaskStatus] = mapped_column(
        SQLEnum(BookingTaskStatus),
        nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # Las fotos de esta tarea, en el orden en que se subieron. Así se
    # leen con task.photos, sin buscarlas a mano.
    photos = db.relationship(
        "Media",
        order_by="Media.media_id"
    )

    def serialize(self):
        return {
            "booking_task_id": self.booking_task_id,
            "booking_id": self.booking_id,
            "task_id": self.task_id,
            "task_name": self.task_name,
            "status": (
                self.status.value
                if self.status
                else None
            ),
            "completed_at": (
                self.completed_at.isoformat()
                if self.completed_at
                else None
            ),
            "notes": self.notes,
            # El antes y el después, que el trabajador sube para cerrarla.
            "photos": [photo.serialize() for photo in self.photos],
        }


# ==================================================================
# REVIEW
# ==================================================================
# Valoración del cliente: como mucho una por reserva (booking_id único).

class Review(db.Model):
    __tablename__ = "reviews"

    review_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.booking_id"),
        unique=True,
        nullable=False
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"),
        nullable=False
    )
    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    def serialize(self):
        return {
            "review_id": self.review_id,
            "booking_id": self.booking_id,
            "client_id": self.client_id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
        }


# ==================================================================
# INCIDENT
# ==================================================================
# Incidencia en una reserva; puede señalar al trabajador y a la tarea.

class Incident(db.Model):
    __tablename__ = "incidents"

    incident_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.booking_id"),
        nullable=False
    )
    worker_id: Mapped[int | None] = mapped_column(
        ForeignKey("workers.worker_id"),
        nullable=True
    )
    booking_task_id: Mapped[int | None] = mapped_column(
        ForeignKey("booking_tasks.booking_task_id"),
        nullable=True
    )
    incident_type: Mapped[IncidentType | None] = mapped_column(
        SQLEnum(IncidentType),
        nullable=True
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    resolved: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    # Quién la abrió y quién es esa persona. Con source basta para
    # filtrar en el listado del encargado (#19); reported_by dice el
    # usuario concreto, para poder avisarle cuando se resuelva.
    source: Mapped[IncidentSource | None] = mapped_column(
        SQLEnum(IncidentSource),
        nullable=True
    )
    reported_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.user_id"),
        nullable=True
    )

    # Lo que el encargado escribe al cerrarla. Lo ve el cliente cuando la
    # incidencia es suya, así que se guarda tal cual y no como una nota
    # interna (#19).
    resolution: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # Las fotos de la incidencia, en el orden en que se subieron. Con la
    # relación se pueden precargar al listar; con una consulta suelta
    # dentro de serialize() caía una por incidencia.
    media = db.relationship(
        "Media",
        order_by="Media.media_id"
    )

    def serialize(self):

        return {
            "incident_id": self.incident_id,
            "booking_id": self.booking_id,
            "worker_id": self.worker_id,
            "booking_task_id": self.booking_task_id,

            # Los enums viajan como texto: el front no sabe de Python.
            "incident_type": (
                self.incident_type.value
                if self.incident_type
                else None
            ),
            "source": self.source.value if self.source else None,

            "reported_by": self.reported_by,
            "description": self.description,
            "resolved": self.resolved,
            "resolution": self.resolution,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "resolved_at": (
                self.resolved_at.isoformat()
                if self.resolved_at
                else None
            ),
            "media": [media_item.serialize() for media_item in self.media],
        }


# ==================================================================
# MEDIA
# ==================================================================
# Foto o vídeo de una incidencia, o del antes y el después de una tarea.
# Cada archivo cuelga de UNA de las dos cosas, nunca de las dos ni de
# ninguna: lo garantiza la restricción del final de la clase.

class Media(db.Model):
    __tablename__ = "media"

    media_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    # Uno de los dos lleva valor y el otro va vacío.
    incident_id: Mapped[int | None] = mapped_column(
        ForeignKey("incidents.incident_id"),
        nullable=True,
        index=True
    )
    booking_task_id: Mapped[int | None] = mapped_column(
        ForeignKey("booking_tasks.booking_task_id"),
        nullable=True,
        index=True
    )
    kind: Mapped[MediaKind] = mapped_column(
        SQLEnum(MediaKind),
        nullable=False
    )
    # Quién la subió: el trabajador que cierra la tarea o el cliente que
    # reclama. Hace falta para saber de quién es la prueba.
    uploaded_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.user_id"),
        nullable=True
    )
    media_url: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    media_type: Mapped[MediaType] = mapped_column(
        SQLEnum(MediaType),
        nullable=False
    )
    uploaded_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    # La regla la pone la base de datos y no el código: así no hay forma
    # de colar una foto huérfana, venga de donde venga.
    __table_args__ = (
        db.CheckConstraint(
            "(incident_id IS NULL) <> (booking_task_id IS NULL)",
            name="media_one_owner",
        ),
    )

    def serialize(self):
        return {
            "media_id": self.media_id,
            "incident_id": self.incident_id,
            "booking_task_id": self.booking_task_id,
            "kind": self.kind.value if self.kind else None,
            "uploaded_by": self.uploaded_by,
            "media_url": self.media_url,
            "media_type": (
                self.media_type.value
                if self.media_type
                else None
            ),
            "uploaded_at": (
                self.uploaded_at.isoformat()
                if self.uploaded_at
                else None
            ),
        }

# Ausencias por días completos de Madrid; ambos extremos son inclusivos.


class Absence(db.Model):
    __tablename__ = "absences"
    __table_args__ = (
        db.CheckConstraint(
            "ends_on IS NULL OR ends_on >= starts_on", name="ck_absence_dates"),
        db.CheckConstraint(
            "reason IN ('vacaciones', 'baja', 'otro')", name="ck_absence_reason"),
    )

    absence_id: Mapped[int] = mapped_column(primary_key=True)
    worker_id: Mapped[int] = mapped_column(
        ForeignKey("workers.worker_id"), nullable=False, index=True
    )
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    reason: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Una carga por grupo de trabajadores, no una consulta por hueco.
    worker = db.relationship(
        "Worker", backref=db.backref("absences", lazy="selectin")
    )

    def serialize(self):
        return {
            "absence_id": self.absence_id,
            "worker_id": self.worker_id,
            "starts_on": self.starts_on.isoformat(),
            "ends_on": self.ends_on.isoformat() if self.ends_on else None,
            "reason": self.reason,
            "notes": self.notes,
        }


# ==================================================================
# JOB APPLICATION
# ==================================================================
# Candidatura enviada desde el formulario público "Trabaja con nosotros".


class JobApplication(db.Model):
    __tablename__ = "job_applications"

    application_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    last_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(120),
        nullable=False
    )
    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
    experience: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    message: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    status: Mapped[ApplicationStatus] = mapped_column(
        SQLEnum(
            ApplicationStatus,
            values_callable=lambda enum: [item.value for item in enum],
            name="application_status"
        ),
        nullable=False,
        default=ApplicationStatus.NEW,
        server_default=ApplicationStatus.NEW.value
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    def serialize(self):
        return {
            "application_id": self.application_id,
            "name": self.name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "experience": self.experience,
            "message": self.message,
            "status": self.status.value if self.status else None,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
        }


# ==================================================================
# CONTACT MESSAGE
# ==================================================================
# Mensaje enviado desde el formulario público de contacto.

class ContactMessage(db.Model):
    __tablename__ = "contact_messages"

    contact_message_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(120),
        nullable=False
    )
    phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )
    subject: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    message: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    status: Mapped[ApplicationStatus] = mapped_column(
        SQLEnum(
            ApplicationStatus,
            values_callable=lambda enum: [item.value for item in enum],
            name="application_status"
        ),
        nullable=False,
        default=ApplicationStatus.NEW,
        server_default=ApplicationStatus.NEW.value
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    def serialize(self):
        return {
            "contact_message_id": self.contact_message_id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "subject": self.subject,
            "message": self.message,
            "status": self.status.value if self.status else None,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
        }
