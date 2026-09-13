"""
Comandos de terminal del backend.

Se ejecutan fuera de la API, pero con acceso a la base de datos igual que
cualquier endpoint:

    pipenv run insert-test-data        catálogo de tareas y servicios
    flask insert-test-users 5          clientes de prueba

Los dos se pueden repetir las veces que haga falta: lo que ya existe no
se duplica ni se modifica.
"""

import click
from api.models import db, User, Service, Task
from api.utils import slugify


# ----------------------------------------------------------------------
# CATÁLOGO DE PRUEBA
#
# Lo mínimo para poder trabajar: las once tareas y los cuatro servicios
# del negocio (ver issue #11, apartado 2).
#
# Hay además UNA tarea y UN servicio desactivados a propósito. Son los que
# permiten comprobar que las rutas públicas no enseñan lo inactivo.
#
# Los precios de la web salen de aquí mientras no los cambie el encargado.
# ----------------------------------------------------------------------

# En singular: una tarea es una unidad. Tres habitaciones son tres veces
# "Limpiar habitación", no una sola "Limpiar habitaciones".
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

    # DESACTIVADA A PROPÓSITO: no debe salir en GET /api/tasks.
    {"task_name": "Limpiar piscina",        "description": "Vaso, bordes y zona de baño de una piscina.",    "is_active": False},
]

# El slug no se escribe: se genera del nombre con slugify(), igual que
# hará el endpoint de crear servicio.
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


]


def setup_commands(app):

    # ------------------------------------------------------------------
    # flask insert-test-data
    # ------------------------------------------------------------------

    @app.cli.command("insert-test-data")
    def insert_test_data():
        """Crea el catálogo de tareas y servicios de prueba."""

        created_tasks = 0

        for data in TASKS:
            # Se busca por el campo único. Si ya existe NO se toca: así un
            # cambio hecho a mano desde el panel no se pierde al repetir
            # el comando.
            exists = db.session.execute(
                db.select(Task).where(Task.task_name == data["task_name"])
            ).scalar_one_or_none()

            if exists:
                continue

            db.session.add(Task(**data))
            created_tasks += 1

        created_services = 0

        for data in SERVICES:
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
