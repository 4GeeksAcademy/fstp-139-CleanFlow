"""
Comandos de terminal del backend: corren fuera de la API, con acceso a la BD.

    pipenv run insert-test-data    catálogo, personas, reservas y reseñas de prueba

Se puede repetir sin miedo: lo que ya existe no se duplica ni se toca.

    1. Catálogo      tareas y servicios
    2. Personas      turnos, encargado, cliente y trabajadores
    3. Reservas      escenarios de disponibilidad y reservas hechas con reseña
    4. Ayudantes     búsquedas y crear una reserva
    5. Bloques       lo que crea cada parte
    6. El comando

⚠️ SOLO PARA DESARROLLO: todas las cuentas usan TEST_PASSWORD.
"""

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from api.models import (
    db, Service, Task, User, Shift, Worker, Address,
    Booking, BookingDay, BookingTask, BookingStatus, BookingTaskStatus, Review,
    Media, MediaKind, MediaType, Incident, IncidentType, IncidentSource,
)
from api.utils import slugify


# ------------------------------------------------------------------
# 1. CATÁLOGO
# ------------------------------------------------------------------
# El del negocio (#11), más una tarea y un servicio desactivados a
# propósito: para probar las pestañas "Desactivadas" y que las rutas
# públicas (#36) no enseñan lo inactivo.

# En singular: tres habitaciones son tres veces "Limpiar habitación".
TASKS = [
    {"task_name": "Limpiar habitación",     "description": "Polvo, superficies y suelo de un dormitorio.",   "is_active": True},
    {"task_name": "Limpiar baño",           "description": "Sanitarios, azulejos, espejo y suelo.",           "is_active": True},
    {"task_name": "Limpiar cocina",         "description": "Encimera, fregadero, frentes y suelo.",           "is_active": True},
    {"task_name": "Limpiar cristales",      "description": "Ventanas y cristaleras, por dentro y por fuera.", "is_active": True},
    {"task_name": "Limpiar garaje privado", "description": "Barrido y fregado de un garaje particular.",      "is_active": True},
    {"task_name": "Limpiar trastero",       "description": "Polvo, estanterías y suelo de un trastero.",      "is_active": True},
    {"task_name": "Limpiar balcón",         "description": "Suelo, barandilla y cristal de un balcón.",       "is_active": True},
    {"task_name": "Limpiar terraza",        "description": "Suelo, barandillas y mobiliario de exterior.",    "is_active": True},
    {"task_name": "Limpiar barbacoa",       "description": "Parrilla y superficies de una barbacoa.",         "is_active": True},
    {"task_name": "Limpiar armario",        "description": "Interior y exterior de un armario.",              "is_active": True},
    {"task_name": "Hacer plancha",          "description": "Planchado de ropa.",                              "is_active": True},

    # DESACTIVADA A PROPÓSITO: no debe salir en las rutas públicas (#36).
    {"task_name": "Limpiar piscina",        "description": "Vaso, bordes y zona de baño de una piscina.",    "is_active": False},
]

# Sin slug: se genera con slugify(), igual que en el endpoint de crear servicio.
SERVICES = [
    {
        "name": "Limpieza esencial",
        "description": "El mantenimiento para tener la casa al día.",
        "base_hourly_rate": 30,
        "minutes_per_task": 20,     # 3 tareas por hora
        "min_hours": 1,
        "hour_step": 1,
        "max_hours": 8,             # una jornada: no se parte en varios días
        "is_active": True,
    },
    {
        "name": "Limpieza integral",
        "description": "La limpieza completa de tu casa, de arriba abajo.",
        "base_hourly_rate": 40,
        "minutes_per_task": 30,     # 2 tareas por hora
        "min_hours": 1,
        "hour_step": 1,
        "max_hours": 8,
        "is_active": True,
    },
    {
        "name": "Limpieza profunda",
        "description": "Para cuando hace falta llegar donde no se llega a diario.",
        "base_hourly_rate": 60,
        "minutes_per_task": 60,     # 1 tarea por hora
        "min_hours": 1,
        "hour_step": 1,
        "max_hours": 8,
        "is_active": True,
    },
    {
        "name": "Limpieza fin de obra",
        "description": "Retirada de polvo y restos tras una reforma.",
        "base_hourly_rate": 90,
        "minutes_per_task": None,   # sin tareas: se contratan horas
        "min_hours": 8,             # 8, 12, 16... 56: jornadas y medias jornadas
        "hour_step": 4,
        "max_hours": 56,            # 7 jornadas: la obra sí se parte en días
        "is_active": True,
    },

    # DESACTIVADO A PROPÓSITO: fuera de la web (#36), visible para el encargado.
    {
        "name": "Limpieza de oficinas",
        "description": "Mantenimiento de oficinas y locales pequeños.",
        "base_hourly_rate": 35,
        "minutes_per_task": 30,     # 2 tareas por hora
        "min_hours": 2,
        "hour_step": 1,
        "max_hours": 8,
        "is_active": False,
    },
]


# ------------------------------------------------------------------
# 2. PERSONAS
# ------------------------------------------------------------------
# Para entrar en la aplicación tras cada reset_db sin registrarse a mano.

TEST_PASSWORD = "cleanflow123"

# Días de lunes (1) a domingo (7), como Shift.days.
SHIFTS = [
    {"name": "Mañana", "start_time": time(6, 0),  "end_time": time(14, 0), "days": [1, 2, 3, 4, 5]},
    {"name": "Tarde",  "start_time": time(14, 0), "end_time": time(22, 0), "days": [1, 2, 3, 4, 5]},
]

# Tres trabajadores de mañana y uno de tarde, para poder llenar la mañana
# entera. Cuatro clientes: uno es el de las pruebas y los otros tres dan
# nombres distintos a las opiniones de la web.
PEOPLE = [
    {"email": "encargado@cleanflow.test", "name": "Elena",  "last_name": "Soto",   "phone": "600000001", "role": "manager"},
    {"email": "cliente@cleanflow.test",   "name": "Pablo",  "last_name": "Vega",   "phone": "600000002", "role": "client"},
    {"email": "lucia@cleanflow.test",     "name": "Lucía",  "last_name": "Márquez", "phone": "600000007", "role": "client"},
    {"email": "javier@cleanflow.test",    "name": "Javier", "last_name": "Ortega",  "phone": "600000008", "role": "client"},
    {"email": "rocio@cleanflow.test",     "name": "Rocío",  "last_name": "Pardo",   "phone": "600000009", "role": "client"},
    {"email": "ana@cleanflow.test",       "name": "Ana",    "last_name": "García", "phone": "600000003", "role": "worker", "shift": "Mañana"},
    {"email": "luis@cleanflow.test",      "name": "Luis",   "last_name": "Martín", "phone": "600000004", "role": "worker", "shift": "Mañana"},
    {"email": "marta@cleanflow.test",     "name": "Marta",  "last_name": "Ruiz",   "phone": "600000005", "role": "worker", "shift": "Mañana"},
    {"email": "carlos@cleanflow.test",    "name": "Carlos", "last_name": "Díaz",   "phone": "600000006", "role": "worker", "shift": "Tarde"},
]


# ------------------------------------------------------------------
# 3. RESERVAS
# ------------------------------------------------------------------
# Tres escenarios para probar la disponibilidad (#69). Las fechas se
# calculan desde el día en que se ejecuta el comando: siempre caen
# dentro de la ventana de reserva.
#
#   DÍA LLENO     un miércoles con el turno de mañana entero ocupado: Ana,
#                 Luis y Marta las 8 h. Ese día no hay huecos de mañana.
#   MARGEN        el jueves siguiente, Ana de 08:00 a 11:00. Con los 30
#                 minutos de margen no puede empezar otra a las 11:00,
#                 pero sí a las 11:30.
#   VARIOS DÍAS   el viernes siguiente, Carlos (tarde, de lunes a viernes)
#                 12 horas: 8 h el viernes y 4 el LUNES, saltándose el
#                 fin de semana.
#   YA HECHAS     reservas completadas en las semanas anteriores, cada una
#                 con su reseña: dan la valoración del listado de
#                 trabajadores (Ana 4,8, Luis 4,5 y Carlos 3,7). Repartidas
#                 entre los cuatro clientes, porque sus nombres salen en la
#                 web pública (#20).
#   EN MARCHA     los estados nuevos (#81): una en curso hoy con fotos del
#                 antes y el después, una finalizada ayer pendiente de que
#                 el cliente la confirme, y una no realizada con su
#                 incidencia.
#   RESPUESTAS    las tres situaciones de la #83: una finalizada hace ocho
#                 días que se dio por buena sola, otra reclamada que sigue
#                 en revisión, y otra confirmada a mano y sin valorar, que
#                 es la que enseña el formulario de la #20.
#
# La #15 reutiliza los tres primeros para probar las reservas afectadas.

# Hora de Madrid sin zona, como se guardan las reservas.
MADRID = ZoneInfo("Europe/Madrid")

# Marca en client_notes: así el comando reconoce sus reservas y no las duplica.
SEED_MARK = "[datos de prueba]"

# Las reseñas de las reservas ya hechas: (trabajador, nota, comentario).
# Marta no tiene ninguna a propósito: así se ve "Sin valoraciones".
# Trabajador, cliente, nota y comentario. Repartidas entre varias
# personas: la media de cada trabajador tiene que salir distinta, y en la
# web pública no pueden aparecer seis opiniones firmadas igual.
PAST_REVIEWS = [
    ("ana@cleanflow.test",    "cliente@cleanflow.test", 5, "Impecable y muy puntual."),
    ("ana@cleanflow.test",    "lucia@cleanflow.test",   5, "Dejó la cocina como nueva."),
    ("ana@cleanflow.test",    "javier@cleanflow.test",  4, "Muy bien, aunque llegó un poco tarde."),
    ("ana@cleanflow.test",    "rocio@cleanflow.test",   5, "Repetiremos seguro."),
    ("ana@cleanflow.test",    "cliente@cleanflow.test", 5, None),
    ("luis@cleanflow.test",   "lucia@cleanflow.test",   5, "Rápido y muy cuidadoso."),
    ("luis@cleanflow.test",   "javier@cleanflow.test",  4, "Todo correcto."),
    ("luis@cleanflow.test",   "rocio@cleanflow.test",   4, None),
    ("luis@cleanflow.test",   "cliente@cleanflow.test", 5, "Muy amable."),
    ("carlos@cleanflow.test", "lucia@cleanflow.test",   4, "Buen trabajo."),
    ("carlos@cleanflow.test", "javier@cleanflow.test",  3, "Se dejó el baño a medias."),
    ("carlos@cleanflow.test", "rocio@cleanflow.test",   4, None),
]


# ------------------------------------------------------------------
# 4. AYUDANTES
# ------------------------------------------------------------------

# Días en español sin depender del idioma del sistema.
WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]


def next_weekday(start, weekday):
    """El primer día desde `start` (incluido) que cae en `weekday` (1-7)."""
    return start + timedelta(days=(weekday - start.isoweekday()) % 7)


def at(day, hour):
    """Un día a una hora en punto: at(miércoles, 8) -> miércoles 08:00."""
    return datetime.combine(day, time(hour, 0))


# Buscar una fila por un dato único.

def user_by_email(email):
    return db.session.execute(
        db.select(User).filter_by(email=email)
    ).scalar_one_or_none()


def worker_by_email(email):
    return db.session.execute(
        db.select(Worker).join(User, Worker.user_id == User.user_id).where(User.email == email)
    ).scalar_one()


def service_by_slug(slug):
    return db.session.execute(
        db.select(Service).filter_by(slug=slug)
    ).scalar_one()


def add_booking(client, address, service, worker, days, note, tasks=(), status=BookingStatus.CONFIRMED):
    """Una reserva con sus tramos (confirmada, salvo que se diga otro estado).

    days: lista de (inicio, fin) · tasks: tareas, con sus repeticiones.
    Devuelve la reserva, para poder colgarle una reseña.
    """
    hours = sum((end - start).seconds // 3600 for start, end in days)

    booking = Booking(
        client_id=client.user_id,
        service_id=service.service_id,
        address_id=address.address_id,
        worker_id=worker.worker_id,
        scheduled_start=days[0][0],
        scheduled_end=days[-1][1],
        hourly_rate=service.base_hourly_rate,
        minutes_per_task=service.minutes_per_task,
        total_price=hours * service.base_hourly_rate,
        status=status,
        client_notes=f"{SEED_MARK} {note}",
        created_at=datetime.now(MADRID).replace(tzinfo=None),
    )

    # Se guardan con la reserva gracias a la relación Booking.days.
    for start, end in days:
        booking.days.append(BookingDay(starts_at=start, ends_at=end))

    db.session.add(booking)

    # flush: pide el id de la reserva sin cerrar la transacción.
    db.session.flush()

    for task in tasks:
        db.session.add(BookingTask(
            booking_id=booking.booking_id,
            task_id=task.task_id,
            task_name=task.task_name,
            # Una reserva ya hecha tiene todas sus tareas terminadas.
            status=BookingTaskStatus.COMPLETED if status == BookingStatus.COMPLETED else BookingTaskStatus.PENDING,
        ))

    return booking


# ------------------------------------------------------------------
# 5. BLOQUES
# ------------------------------------------------------------------

def create_catalog():
    """Tareas y servicios. Devuelve cuántos de cada uno se crearon."""
    created_tasks = 0

    for data in TASKS:
        # Si ya existe no se toca: se respetan los cambios hechos desde el panel.
        exists = db.session.execute(
            db.select(Task).where(Task.task_name == data["task_name"])
        ).scalar_one_or_none()

        if exists:
            continue

        db.session.add(Task(**data))
        created_tasks += 1

    created_services = 0

    for data in SERVICES:
        # Igual que las tareas, pero buscando por slug.
        slug = slugify(data["name"])

        exists = db.session.execute(
            db.select(Service).where(Service.slug == slug)
        ).scalar_one_or_none()

        if exists:
            continue

        db.session.add(Service(slug=slug, **data))
        created_services += 1

    # flush: las reservas necesitan los ids del catálogo.
    db.session.flush()

    return created_tasks, created_services


def create_people():
    """Turnos, usuarios, trabajadores y la dirección del cliente."""
    shifts = {}
    created_shifts = 0

    for data in SHIFTS:
        shift = db.session.execute(
            db.select(Shift).filter_by(name=data["name"])
        ).scalar_one_or_none()

        if not shift:
            shift = Shift(name=data["name"], start_time=data["start_time"], end_time=data["end_time"])
            shift.days = data["days"]
            db.session.add(shift)
            created_shifts += 1

        shifts[data["name"]] = shift

    # flush: cada trabajador necesita el id de su turno.
    db.session.flush()

    created_people = 0

    for data in PEOPLE:
        if user_by_email(data["email"]):
            continue

        user = User(
            email=data["email"],
            name=data["name"],
            last_name=data["last_name"],
            phone=data["phone"],
            role=data["role"],
            is_active=True,
        )
        user.set_password(TEST_PASSWORD)
        db.session.add(user)

        # flush: la ficha de trabajador y la dirección necesitan el user_id.
        db.session.flush()

        if data["role"] == "worker":
            db.session.add(Worker(user_id=user.user_id, shift_id=shifts[data["shift"]].shift_id))

        if data["role"] == "client":
            db.session.add(Address(
                client_id=user.user_id,
                street="Calle de Alcalá",
                number="42",
                postal_code="28014",
                city="Madrid",
                is_default=True,
            ))

        created_people += 1

    db.session.flush()

    return created_shifts, created_people


def create_bookings():
    """Las reservas de los tres escenarios. Devuelve cuántas se crearon.

    Todas o ninguna: si ya hay alguna con la marca, no crea nada. Sus
    fechas quedan fijas: para recalcularlas, rehacer la base de datos.
    """
    # Las ya hechas (create_reviews) no cuentan: son otro bloque.
    exists = db.session.execute(
        db.select(Booking).where(
            Booking.client_notes.startswith(SEED_MARK),
            Booking.status != BookingStatus.COMPLETED,
        )
    ).scalars().first()

    if exists:
        return 0

    client = user_by_email("cliente@cleanflow.test")
    address = db.session.execute(
        db.select(Address).filter_by(client_id=client.user_id, is_active=True)
    ).scalars().first()

    fin_de_obra = service_by_slug("limpieza-fin-de-obra")
    profunda = service_by_slug("limpieza-profunda")
    habitacion = db.session.execute(
        db.select(Task).filter_by(task_name="Limpiar habitación")
    ).scalar_one()

    # Tres días por delante como mínimo: fuera de las 24 h de antelación.
    today = datetime.now(MADRID).date()
    full_day = next_weekday(today + timedelta(days=3), 3)    # miércoles
    margin_day = full_day + timedelta(days=1)                # jueves
    long_start = full_day + timedelta(days=2)                # viernes
    long_second = long_start + timedelta(days=3)             # lunes

    # ---- DÍA LLENO ----
    for email in ("ana@cleanflow.test", "luis@cleanflow.test", "marta@cleanflow.test"):
        add_booking(
            client, address, fin_de_obra, worker_by_email(email),
            [(at(full_day, 6), at(full_day, 14))],
            "Día lleno: el turno de mañana entero ocupado.",
        )

    # ---- MARGEN ----
    # Profunda: 60 min por tarea, así que 3 habitaciones = 3 h.
    add_booking(
        client, address, profunda, worker_by_email("ana@cleanflow.test"),
        [(at(margin_day, 8), at(margin_day, 11))],
        "Margen: acaba a las 11:00.",
        tasks=[habitacion] * 3,
    )

    # ---- VARIOS DÍAS ----
    add_booking(
        client, address, fin_de_obra, worker_by_email("carlos@cleanflow.test"),
        [(at(long_start, 14), at(long_start, 22)), (at(long_second, 14), at(long_second, 18))],
        "Varios días: 8 h el viernes y 4 el lunes.",
    )

    return 5


def create_reviews():
    """Reservas ya hechas, cada una con su reseña. Devuelve cuántas creó.

    Aparte de create_bookings(): así se añaden también a una base de datos
    que ya tenía las otras reservas de prueba, sin tener que rehacerla.
    """
    exists = db.session.execute(
        db.select(Booking).where(
            Booking.client_notes.startswith(SEED_MARK),
            Booking.status == BookingStatus.COMPLETED,
        )
    ).scalars().first()

    if exists:
        return 0

    profunda = service_by_slug("limpieza-profunda")
    habitacion = db.session.execute(
        db.select(Task).filter_by(task_name="Limpiar habitación")
    ).scalar_one()

    today = datetime.now(MADRID).date()

    # Una por semana hacia atrás, siempre un martes: nunca se pisan. Dos
    # habitaciones de profunda = 2 h, empezando 2 h después de su turno.
    for weeks_ago, (worker_email, client_email, rating, comment) in enumerate(
        PAST_REVIEWS, start=1
    ):
        worker = worker_by_email(worker_email)

        # Cada reseña es de un cliente distinto: en la web pública se ven
        # nombres variados y no seis veces el mismo.
        review_client = user_by_email(client_email)
        review_address = db.session.execute(
            db.select(Address).filter_by(
                client_id=review_client.user_id, is_active=True
            )
        ).scalars().first()

        day = next_weekday(today - timedelta(weeks=weeks_ago), 2)
        start = worker.shift.start_time.hour + 2

        booking = add_booking(
            review_client, review_address, profunda, worker,
            [(at(day, start), at(day, start + 2))],
            "Ya hecha, con reseña.",
            tasks=[habitacion] * 2,
            status=BookingStatus.COMPLETED,
        )

        review = Review(
            booking_id=booking.booking_id,
            client_id=review_client.user_id,
            rating=rating,
            comment=comment,
            created_at=at(day, start + 3),
        )
        db.session.add(review)

        # flush: hace falta el id de la reseña para colgarle las fotos.
        db.session.flush()

        # Solo la primera lleva fotos: con una basta para ver la galería
        # en el detalle, y así el seed no se llena de imágenes de relleno.
        if weeks_ago == 1:
            for n in (1, 2):
                db.session.add(Media(
                    review_id=review.review_id,
                    kind=MediaKind.REVIEW,
                    media_url=f"https://picsum.photos/seed/resena-{n}/640/480",
                    media_type=MediaType.IMAGE,
                    uploaded_by=review_client.user_id,
                    uploaded_at=at(day, start + 3),
                ))

    return len(PAST_REVIEWS)


def create_states():
    """Una reserva por cada situación posible del flujo. Devuelve cuántas
    creó.

    En curso, finalizada sin confirmar, no realizada, cancelada,
    confirmada sola, reclamada y confirmada a mano sin valorar.

    Aparte de los otros bloques para poder añadirlas a una base de datos
    que ya tenía las demás reservas, sin rehacerla.
    """
    exists = db.session.execute(
        db.select(Booking).where(
            Booking.client_notes.startswith(SEED_MARK),
            Booking.status.in_(
                [BookingStatus.IN_PROGRESS, BookingStatus.NOT_DONE]),
        )
    ).scalars().first()

    if exists:
        return 0

    client = user_by_email("cliente@cleanflow.test")
    address = db.session.execute(
        db.select(Address).filter_by(client_id=client.user_id, is_active=True)
    ).scalars().first()

    profunda = service_by_slug("limpieza-profunda")
    habitacion = db.session.execute(
        db.select(Task).filter_by(task_name="Limpiar habitación")
    ).scalar_one()

    ana = worker_by_email("ana@cleanflow.test")
    luis = worker_by_email("luis@cleanflow.test")

    hoy = datetime.now(MADRID).date()
    ayer = hoy - timedelta(days=1)
    ahora = datetime.now(MADRID).replace(tzinfo=None)

    def add_photo(task, kind, name, worker):
        """Una foto de relleno de picsum.photos: el seed no sube nada a
        Cloudinary, que gasta cuota y necesitaría las claves."""
        db.session.add(Media(
            booking_task_id=task.booking_task_id,
            kind=kind,
            media_url=f"https://picsum.photos/seed/{name}/640/480",
            media_type=MediaType.IMAGE,
            uploaded_by=worker.user_id,
            uploaded_at=ahora,
        ))

    # ---- EN CURSO: Ana está trabajando ahora mismo ----
    in_progress = add_booking(
        client, address, profunda, ana,
        [(at(hoy, 8), at(hoy, 12))],
        "En curso, con una tarea cerrada.",
        tasks=[habitacion] * 2,
        status=BookingStatus.IN_PROGRESS,
    )
    in_progress.started_at = at(hoy, 8)
    in_progress.days[0].started_at = at(hoy, 8)
    db.session.flush()

    # La primera tarea, cerrada con su antes y su después.
    first_task = in_progress.tasks[0]
    first_task.status = BookingTaskStatus.COMPLETED
    first_task.completed_at = at(hoy, 9)
    add_photo(first_task, MediaKind.BEFORE, "antes-1", ana)
    add_photo(first_task, MediaKind.AFTER, "despues-1", ana)

    # ---- FINALIZADA AYER: esperando que el cliente confirme (#83) ----
    finished = add_booking(
        client, address, profunda, luis,
        [(at(ayer, 8), at(ayer, 10))],
        "Finalizada, pendiente de confirmar.",
        tasks=[habitacion],
        status=BookingStatus.COMPLETED,
    )
    finished.started_at = at(ayer, 8)
    finished.completed_at = at(ayer, 10)
    finished.days[0].started_at = at(ayer, 8)
    finished.days[0].finished_at = at(ayer, 10)
    db.session.flush()

    add_photo(finished.tasks[0], MediaKind.BEFORE, "antes-2", luis)
    add_photo(finished.tasks[0], MediaKind.AFTER, "despues-2", luis)

    # ---- NO REALIZADA: el cliente no estaba, con su incidencia (#18) ----
    not_done = add_booking(
        client, address, profunda, ana,
        [(at(ayer, 14), at(ayer, 16))],
        "No realizada: el cliente no estaba.",
        tasks=[habitacion],
        status=BookingStatus.NOT_DONE,
    )
    not_done.started_at = at(ayer, 14)
    db.session.flush()

    db.session.add(Incident(
        booking_id=not_done.booking_id,
        worker_id=ana.worker_id,
        incident_type=IncidentType.CLIENT,
        source=IncidentSource.WORKER,
        reported_by=ana.user_id,
        description="Nadie abrió la puerta. Esperé 20 minutos y llamé dos veces.",
        resolved=False,
        created_at=at(ayer, 14),
    ))

    # ---- CANCELADA: el cliente anuló una de la semana que viene ----
    # No la cancela nadie desde la aplicación (eso es la #17): se crea ya
    # cancelada, para que el listado del cliente tenga qué enseñar.
    cancelada = add_booking(
        client, address, profunda, luis,
        [(at(hoy + timedelta(days=5), 10), at(hoy + timedelta(days=5), 12))],
        "Cancelada por el cliente.",
        tasks=[habitacion],
        status=BookingStatus.CANCELLED,
    )
    cancelada.cancellation_reason = "Me surgió un viaje y no voy a estar en casa."

    # ---- CONFIRMADA SOLA: pasaron los 3 días sin respuesta (#83) ----
    # No lleva client_confirmed_at a propósito: el cliente no confirmó
    # nada. Booking.confirmation lo deduce de completed_at y la fecha.
    vencida = add_booking(
        client, address, profunda, luis,
        [(at(hoy - timedelta(days=8), 9), at(hoy - timedelta(days=8), 11))],
        "Finalizada hace más de una semana, sin respuesta.",
        tasks=[habitacion],
        status=BookingStatus.COMPLETED,
    )
    vencida.started_at = at(hoy - timedelta(days=8), 9)
    vencida.completed_at = at(hoy - timedelta(days=8), 11)
    vencida.days[0].started_at = vencida.started_at
    vencida.days[0].finished_at = vencida.completed_at
    db.session.flush()

    add_photo(vencida.tasks[0], MediaKind.BEFORE, "antes-3", luis)
    add_photo(vencida.tasks[0], MediaKind.AFTER, "despues-3", luis)

    # ---- CONFIRMADA A MANO: el cliente dijo que sí y aún no ha valorado ----
    # Es la que enseña el formulario de valoración (#20): finalizada,
    # confirmada y sin reseña.
    confirmada = add_booking(
        client, address, profunda, ana,
        [(at(hoy - timedelta(days=2), 9), at(hoy - timedelta(days=2), 11))],
        "Finalizada y confirmada, pendiente de valorar.",
        tasks=[habitacion],
        status=BookingStatus.COMPLETED,
    )
    confirmada.started_at = at(hoy - timedelta(days=2), 9)
    confirmada.completed_at = at(hoy - timedelta(days=2), 11)
    confirmada.client_confirmed_at = at(hoy - timedelta(days=1), 12)
    confirmada.days[0].started_at = confirmada.started_at
    confirmada.days[0].finished_at = confirmada.completed_at
    db.session.flush()

    add_photo(confirmada.tasks[0], MediaKind.BEFORE, "antes-4", ana)
    add_photo(confirmada.tasks[0], MediaKind.AFTER, "despues-4", ana)

    # ---- EN REVISIÓN: el cliente reclamó y sigue abierta (#83) ----
    reclamada = add_booking(
        client, address, profunda, ana,
        [(at(hoy - timedelta(days=2), 16), at(hoy - timedelta(days=2), 18))],
        "Finalizada y reclamada por el cliente.",
        tasks=[habitacion],
        status=BookingStatus.COMPLETED,
    )
    reclamada.started_at = at(hoy - timedelta(days=2), 16)
    reclamada.completed_at = at(hoy - timedelta(days=2), 18)
    reclamada.days[0].started_at = reclamada.started_at
    reclamada.days[0].finished_at = reclamada.completed_at
    db.session.flush()

    add_photo(reclamada.tasks[0], MediaKind.BEFORE, "antes-4", ana)
    add_photo(reclamada.tasks[0], MediaKind.AFTER, "despues-4", ana)

    # De empresa y con origen cliente: es él quien se queja del servicio.
    # Sin resolver, así confirmation devuelve "in_review".
    db.session.add(Incident(
        booking_id=reclamada.booking_id,
        worker_id=ana.worker_id,
        incident_type=IncidentType.COMPANY,
        source=IncidentSource.CLIENT,
        reported_by=client.user_id,
        description="El baño quedó sin limpiar y el suelo del salón seguía con polvo.",
        resolved=False,
        created_at=at(hoy - timedelta(days=2), 20),
    ))

    return 6


def print_seed_bookings():
    """Lista las reservas de prueba con sus fechas, para las pruebas."""
    bookings = db.session.execute(
        db.select(Booking)
        .where(Booking.client_notes.startswith(SEED_MARK))
        .order_by(Booking.scheduled_start, Booking.worker_id)
    ).scalars().all()

    for booking in bookings:
        tramos = " + ".join(
            f"{WEEKDAYS[day.starts_at.weekday()]} {day.starts_at:%d/%m %H:%M}-{day.ends_at:%H:%M}"
            for day in booking.days
        )
        worker = booking.worker.user.name
        note = booking.client_notes.removeprefix(SEED_MARK).strip()
        print(f"  {worker:<7} {tramos:<40} {note}")


# ------------------------------------------------------------------
# 6. EL COMANDO
# ------------------------------------------------------------------

def setup_commands(app):

    @app.cli.command("insert-test-data")
    def insert_test_data():
        """Crea el catálogo, las personas y las reservas de prueba."""

        created_tasks, created_services = create_catalog()
        created_shifts, created_people = create_people()
        created_bookings = create_bookings()
        created_reviews = create_reviews()
        created_states = create_states()

        # Un solo commit al final: o entra todo, o nada.
        db.session.commit()

        print(f"Tareas:    {created_tasks} creadas, {len(TASKS) - created_tasks} ya existían")
        print(f"Servicios: {created_services} creados, {len(SERVICES) - created_services} ya existían")
        print(f"Turnos:    {created_shifts} creados, {len(SHIFTS) - created_shifts} ya existían")
        print(f"Personas:  {created_people} creadas, {len(PEOPLE) - created_people} ya existían")
        print(f"Reservas:  {created_bookings} creadas")
        print(f"Reseñas:   {created_reviews} creadas (con sus reservas ya hechas)")
        print(f"Estados:   {created_states} creadas (en curso, finalizada, no realizada,")
        print("           cancelada, vencida, reclamada y confirmada sin valorar)")
        print()
        print(f"Cuentas (contraseña: {TEST_PASSWORD}):")
        for person in PEOPLE:
            print(f"  {person['role']:<8} {person['email']}")
        print()
        print("Reservas de prueba:")
        print_seed_bookings()
