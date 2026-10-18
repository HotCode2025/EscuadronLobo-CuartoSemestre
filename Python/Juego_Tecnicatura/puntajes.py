"""Tabla de mejores puntajes (se guarda en puntajes.json junto al juego)."""
import json
import os

RUTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'puntajes.json')
MAX_PUNTAJES = 5


def cargar():
    """Devuelve la lista de puntajes ordenada de mayor a menor (vacía si todavía no hay)."""
    try:
        with open(RUTA, encoding='utf-8') as archivo:
            datos = json.load(archivo)
        lista = [d for d in datos if isinstance(d, dict) and 'puntos' in d]
        return sorted(lista, key=lambda d: d['puntos'], reverse=True)[:MAX_PUNTAJES]
    except (OSError, ValueError):
        return []


def entra_en_tabla(puntos):
    lista = cargar()
    return puntos > 0 and (len(lista) < MAX_PUNTAJES or puntos > lista[-1]['puntos'])


def guardar(nombre, puntos, nivel):
    lista = cargar()
    lista.append({'nombre': nombre, 'puntos': puntos, 'nivel': nivel})
    lista = sorted(lista, key=lambda d: d['puntos'], reverse=True)[:MAX_PUNTAJES]
    try:
        with open(RUTA, 'w', encoding='utf-8') as archivo:
            json.dump(lista, archivo, ensure_ascii=False, indent=2)
    except OSError:
        pass  # si no se puede escribir, el juego sigue funcionando igual
    return lista


def record():
    lista = cargar()
    return lista[0]['puntos'] if lista else 0
