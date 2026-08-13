"""Context manager para cursores usando el pool de conexiones.

`CursorDelPool` implementa los métodos `__enter__` y `__exit__`
para ser usado con la sentencia `with`, de forma que se obtenga
un cursor, se ejecute alguna operación y automáticamente
se haga commit o rollback según corresponda, liberando la conexión
al finalizar.
"""

from conexion import Conexion
from logger_base import log

class CursorDelPool:
    def __init__(self):
        # Placeholder para la conexión y el cursor que se obtendrán
        self._conexion = None
        self._cursor = None

    def __enter__(self):
        # Se obtiene una conexión del pool y su cursor
        log.debug('Inicio del método with __enter__')
        self._conexion = Conexion.obtenerConexion()
        self._cursor = self._conexion.cursor()
        return self._cursor

    def __exit__(self, tipo_exception, valor_exception, detalle_exception):
        # Al salir del with: si ocurrió excepción hacemos rollback,
        # si no ocurrió, confirmamos la transacción con commit.
        log.debug('Se ejecuta método __exit__')
        if valor_exception:
            # Revertir cambios por error en la transacción
            self._conexion.rollback()
            log.error(f'Ocurrió una excepción, se hace rollback: {valor_exception} {tipo_exception} {detalle_exception}')
        else:
            # Confirmar cambios
            self._conexion.commit()
            log.debug('Se realiza commit de la transacción')
        
        # Siempre cerramos el cursor y devolvemos la conexión al pool
        self._cursor.close()
        Conexion.liberarConexion(self._conexion)


if __name__ == '__main__':
    # Ejemplo de uso: listar registros desde el módulo directamente
    with CursorDelPool() as cursor:
        log.debug('Dentro del bloque with')
        cursor.execute('SELECT * FROM usuario;')
        log.debug(cursor.fetchall())