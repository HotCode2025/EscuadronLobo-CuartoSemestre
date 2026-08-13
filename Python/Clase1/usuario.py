"""Definición de la entidad Usuario.

Clase simple que representa un usuario con `id_usuario`, `username`
y `password`. Incluye propiedades (getters/setters) y una representación
en cadena para facilitar el logging y la impresión.
"""

class Usuario:
    def __init__(self, id_usuario=None, username=None, password=None):
        self._id_usuario = id_usuario
        self._username = username
        self._password = password

    def __str__(self):
        # Representación legible del objeto Usuario
        return f'Usuario [ID: {self._id_usuario}, Username: {self._username}, Password: {self._password}]'

    # Getters y Setters
    @property
    def id_usuario(self):
        return self._id_usuario

    @id_usuario.setter
    def id_usuario(self, id_usuario):
        self._id_usuario = id_usuario

    @property
    def username(self):
        return self._username

    @username.setter
    def username(self, username):
        self._username = username

    @property
    def password(self):
        return self._password

    @password.setter
    def password(self, password):
        self._password = password