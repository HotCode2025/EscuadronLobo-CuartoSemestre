

# help(str_split)

cursos = "Java Javascript Node Python Diseño"
lista_cursos = cursos.split()
print(f"lista_cursos: {lista_cursos}")
print(type(lista_cursos))

cursos_separados_coma = "Java,Pyhon,Node,Javascript,Spring"
lista_cursos = cursos_separados_coma.split(",", 2)
print(f"lista_cursos: {lista_cursos}")
print(len(lista_cursos))


