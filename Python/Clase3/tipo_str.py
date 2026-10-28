# Profundizando en el tipo String
# Concatenación automática en Python

import math


variable = ' Adios'
#mensaje = 'Hola' + 'Alumnos' # tambien puede ser: mensaje = 'Hola' ' Alumnos'
#mensaje = 'Hola ' 'Alumnos' variable # da error de sintaxis
mensaje = 'Hola ' 'Alumnos' + variable # con el + si funciona
mensaje += ', Terminamos'
#print(mensaje)

# Usamos la clase help para ayuda o documentación
#help(str) #toda la documentacion
help(str.capitalize) #documentación especifica de un metodo en particular

help(math.isnan)