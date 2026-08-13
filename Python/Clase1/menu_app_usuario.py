"""Interfaz minimalista por consola para gestionar usuarios.

Presenta un menú con opciones para listar, agregar, actualizar
y eliminar usuarios en la base de datos usando `UsuarioDao`.
Este módulo se ejecuta como script y mantiene un bucle hasta
que el usuario decide salir.
"""

from usuario_dao import UsuarioDao
from usuario import Usuario
from logger_base import log

def mostrar_menu():
    print('''
    *** Opciones del Sistema ***
    1. Listar Usuarios
    2. Agregar Usuario
    3. Actualizar Usuario
    4. Eliminar Usuario
    5. Salir
    ''')


opcion = None

while opcion != 5:
    mostrar_menu()
    try:
        opcion = int(input('Escribe tu opción (1-5): '))
        
        if opcion == 1:
            # Listar todos los usuarios
            usuarios = UsuarioDao.seleccionar()
            print('\n--- Listado de Usuarios ---')
            for usuario in usuarios:
                print(usuario)
                
        elif opcion == 2:
            # Agregar un nuevo usuario
            username_var = input('Escribe el username: ')
            password_var = input('Escribe el password: ')
            usuario = Usuario(username=username_var, password=password_var)
            usuarios_insertados = UsuarioDao.insertar(usuario)
            log.info(f'Usuarios insertados: {usuarios_insertados}')
            
        elif opcion == 3:
            # Actualizar usuario existente por id
            id_usuario_var = int(input('Escribe el id_usuario a actualizar: '))
            username_var = input('Escribe el nuevo username: ')
            password_var = input('Escribe el nuevo password: ')
            usuario = Usuario(id_usuario=id_usuario_var, username=username_var, password=password_var)
            usuarios_actualizados = UsuarioDao.actualizar(usuario)
            log.info(f'Usuarios actualizados: {usuarios_actualizados}')
            
        elif opcion == 4:
            # Eliminar usuario por id
            id_usuario_var = int(input('Escribe el id_usuario a eliminar: '))
            usuario = Usuario(id_usuario=id_usuario_var)
            usuarios_eliminados = UsuarioDao.eliminar(usuario)
            log.info(f'Usuarios eliminados: {usuarios_eliminados}')
            
    except Exception as e:
        # Manejo genérico de errores para no romper el bucle del menú
        log.error(f'Ocurrió un error: {e}')
        opcion = None

else:
    print('Salimos de la aplicación. ¡Hasta luego!')