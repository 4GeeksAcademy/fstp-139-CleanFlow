"""
Comandos de terminal del backend: corren fuera de la API, con acceso a la BD.

    pipenv run insert-test-data    crea el catálogo de tareas y servicios

Se puede repetir sin miedo: lo que ya existe no se duplica ni se modifica.
"""

from api.models import db, Service, Task
from api.utils import slugify


# ------------------------------------------------------------------
# CATÁLOGO DE PRUEBA
# ------------------------------------------------------------------
# Las tareas y servicios del negocio (#11), más una tarea y un servicio
# desactivados a propósito: sirven para probar las pestañas "Desactivadas"
# del panel y que las rutas públicas (#36) no enseñan lo inactivo.
# Los precios de la web salen de aquí hasta que el encargado los cambie.

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
        "is_active": True,
    },
    {
        "name": "Limpieza integral",
        "description": "La limpieza completa de tu casa, de arriba abajo.",
        "base_hourly_rate": 40,
        "minutes_per_task": 30,     # 2 tareas por hora
        "min_hours": 1,
        "hour_step": 1,
        "is_active": True,
    },
    {
        "name": "Limpieza profunda",
        "description": "Para cuando hace falta llegar donde no se llega a diario.",
        "base_hourly_rate": 60,
        "minutes_per_task": 60,     # 1 tarea por hora
        "min_hours": 1,
        "hour_step": 1,
        "is_active": True,
    },
    {
        "name": "Limpieza fin de obra",
        "description": "Retirada de polvo y restos tras una reforma.",
        "base_hourly_rate": 90,
        "minutes_per_task": None,   # sin tareas: se contratan horas
        "min_hours": 6,             # 6, 9, 12, 15...
        "hour_step": 3,
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
        "is_active": False,
    },
]


def setup_commands(app):

    # ------------------------------------------------------------------
    # INSERT-TEST-DATA
    # ------------------------------------------------------------------

    @app.cli.command("insert-test-data")
    def insert_test_data():
        """Crea el catálogo de tareas y servicios de prueba."""

        created_tasks = 0

        for data in TASKS:
            # Si ya existe no se toca: así no se pierden los cambios hechos
            # a mano desde el panel al repetir el comando.
            exists = db.session.execute(
                db.select(Task).where(Task.task_name == data["task_name"])
            ).scalar_one_or_none()

            if exists:
                continue

            db.session.add(Task(**data))
            created_tasks += 1

        created_services = 0

        for data in SERVICES:
            # Mismo criterio que con las tareas, buscando por slug.
            slug = slugify(data["name"])

            exists = db.session.execute(
                db.select(Service).where(Service.slug == slug)
            ).scalar_one_or_none()

            if exists:
                continue

            db.session.add(Service(slug=slug, **data))
            created_services += 1

        # Un solo commit al final: o entra el catálogo entero, o nada.
        db.session.commit()

        print(f"Tareas:    {created_tasks} creadas, {len(TASKS) - created_tasks} ya existían")
        print(f"Servicios: {created_services} creados, {len(SERVICES) - created_services} ya existían")