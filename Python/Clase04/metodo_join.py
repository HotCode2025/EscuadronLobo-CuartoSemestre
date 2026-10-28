
#help(str.join)

tupla_str = ("hola", "alumnos", "tecnictura", "Universidad")
mensaje = " ".join(tupla_str)
print(f"mensaje:{mensaje}")

lista_cursos = ["java", "Python", "Angular", "Spring"]
mensaje = " ".join(lista_cursos)
print(f"mensaje:{mensaje}")

cadena = "holamundo"
mensaje = " ".join(cadena)
print(f"mensaje:{mensaje}")

diccionario = {"nombre", "Juan", "Apellido" : "Perez", "Edad": "18" }
llaves = "-" .join(diccionario.keys())
valores = "-".join(diccionario.values())
print(f"llaves:{llaves}, Type: {type(llaves)}")
print(f"valores:{valores}, Type: {type(valores)}")








