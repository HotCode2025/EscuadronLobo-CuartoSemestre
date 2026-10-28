# Bool contiene los valores True y False

# Los tipos numéricos, es false para el 0 (cero), true para los demás valores
print('Tipos Numéricos')
# False
valor = 0 # solo el cero es false
resultado = bool(valor)
print(f'Valor: {valor}, Resultado: {resultado}')

# True
valor = 15 # 1, -1, 0.1, etc. cualquier numero distinto de cero es true
resultado = bool(valor)
print(f'Valor: {valor}, Resultado: {resultado}')

print('----------------------------')
#---------------------------------------------------------------------------------
# Tipo String -> False '', True para los demás valores
print('Tipos String')
# False
valor = '' # solo el cero es false
resultado = bool(valor)
print(f'Valor: {valor}, Resultado: {resultado}')

# True
valor = 'hola' # con que tenga un contenido ya es true
resultado = bool(valor)
print(f'Valor: {valor}, Resultado: {resultado}')

print('----------------------------')
#---------------------------------------------------------------------------------
# Tipo Colecciones -> False para colecciones vacías - True para todas las demás
print('Tipos Colecciones')
#--------------------------
# Lista
print('Lista')
# False
valor = [] # solo la vacia es false
resultado = bool(valor)
print(f'Valor: {valor}, Resultado: {resultado}')

# True
valor = [2, 3, 4] # con que tenga un contenido ya es true
resultado = bool(valor)
print(f'Valor: {valor}, Resultado: {resultado}')

#--------------------------
# Tupla
print('Tupla')
# False
valor = () # solo la vacia es false
resultado = bool(valor)
print(f'Valor: {valor}, Resultado: {resultado}')

# True
valor = (5,) # con que tenga un contenido ya es true
resultado = bool(valor)
print(f'Valor: {valor}, Resultado: {resultado}')

#--------------------------
# Diccionario
print('Diccionario')
# False
valor = {} # solo la vacia es false
resultado = bool(valor)
print(f'Valor: {valor}, Resultado: {resultado}')

# True
valor = {'Nombre': 'Juan', 'Apellido': 'Perez'} # con que tenga un contenido ya es true
resultado = bool(valor)
print(f'Valor: {valor}, Resultado: {resultado}')


print('----------------------------')
#---------------------------------------------------------------------------------

# Sentencias de control con bool (se aplica lo visto anteriormente)
print('Sentencias de control con bool')
if 'hola':
    print('Regresa True') #si tiene contenido
else:
    print('Regresa False') #si está vacio
    
if 0:
    print('Regresa True') #si es distinto de cero
else:
    print('Regresa False') #si es igual a cero

print('----------------------------')
#---------------------------------------------------------------------------------
# Ciclos
print('Ciclos')
variable = 0
while variable:
    print('Regresa True') #si tiene contenido
    break
else:
    print('Regresa False')