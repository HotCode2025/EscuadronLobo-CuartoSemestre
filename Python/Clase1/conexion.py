"""Módulo de conexión.

Provee la clase `Conexion` para manejar un pool de conexiones
a una base de datos PostgreSQL usando `psycopg2.pool.SimpleConnectionPool`.
Se incluyen métodos de clase para obtener el pool, tomar y liberar
conexiones, y cerrar todas las conexiones del pool.
"""

import sys
from psycopg2 import pool
from logger_base import log

class Conexion:
    _DATABASE = 'test_bd'
    _USERNAME = 'postgres'
    _PASSWORD = 'admin'
    _HOST = '127.0.0.1'
    _DB_PORT = '5432'
    _MIN_CON = 1
    _MAX_CON = 5
    _pool = None

    @classmethod
    def obtenerPool(cls):
        if cls._pool is None:
            # Puntero original para restaurar el manejador de excepciones
            sys_excepthook_original = sys.excepthook
            try:
                # Evitar que la consola falle al imprimir excepciones de psycopg2
                sys.excepthook = lambda t, v, tb: None
                
                cls._pool = pool.SimpleConnectionPool(
                    cls._MIN_CON,
                    cls._MAX_CON,
                    host=cls._HOST,
                    user=cls._USERNAME,
                    password=cls._PASSWORD,
                    port=cls._DB_PORT,
                    database=cls._DATABASE
                )
                # Loguea la creación exitosa del pool (uso para depuración)
                log.debug(f'Creación del pool exitosa: {cls._pool}')
                return cls._pool
            except BaseException as e:
                # Captura cualquier error al crear el pool e informa al usuario.
                # Se sugiere revisar credenciales y que el servicio de PostgreSQL esté en ejecución.
                log.error('Ocurrió un error al obtener el pool: La autenticación de PostgreSQL falló o el servicio está detenido.')
                log.error('Por favor, verifica que _PASSWORD sea la correcta y que la BD test_db exista en pgAdmin.')
                sys.exit()
            finally:
                sys.excepthook = sys_excepthook_original
        else:
            return cls._pool

    @classmethod
    def obtenerConexion(cls):
        # Obtiene una conexión desde el pool configurado
        conexion = cls.obtenerPool().getconn()
        log.debug(f'Conexión obtenida del pool: {conexion}')
        return conexion

    @classmethod
    def liberarConexion(cls, conexion):
        # Devuelve la conexión al pool para su reutilización
        cls.obtenerPool().putconn(conexion)
        log.debug(f'Conexión regresada al pool: {conexion}')

    @classmethod
    def cerrarConexiones(cls):
        if cls._pool:
            # Cierra todas las conexiones abiertas en el pool
            cls._pool.closeall()
            log.debug('Se han cerrado todas las conexiones del pool')