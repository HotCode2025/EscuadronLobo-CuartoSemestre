"""Configuración global del logging.

Este módulo centraliza la configuración de `logging` para la capa
de datos: registra en archivo `capa_datos.log` y en consola, con
formato que incluye timestamp, nivel y ubicación del mensaje.
"""

import logging as log

# Configuración básica del sistema de logging
log.basicConfig(
    level=log.DEBUG,
    format='%(asctime)s: %(levelname)s [%(filename)s:%(lineno)d] %(message)s',
    datefmt='%I:%M:%S %p',
    handlers=[
        log.FileHandler('capa_datos.log'),
        log.StreamHandler()
    ]
)

if __name__ == '__main__':
    # Pequeño autodiagnóstico cuando se ejecuta el módulo directamente
    log.debug('Mensaje a nivel debug')
    log.info('Mensaje a nivel info')
    log.warning('Mensaje a nivel warning')
    log.error('Mensaje a nivel error')
    log.critical('Mensaje a nivel critical')