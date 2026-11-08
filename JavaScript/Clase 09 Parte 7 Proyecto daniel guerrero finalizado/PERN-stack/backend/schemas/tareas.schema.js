import {z} from 'zod';

// En zod 4 los mensajes de "requerido" y "tipo incorrecto" se definen con `error`
const texto = (requerido, tipo) => z.string({
    error: (issue) => issue.input === undefined ? requerido : tipo,
});

const titulo = texto("El titulo es requerido", "El titulo debe ser un string")
    .min(1, { message: "El titulo debe tener al menos 1 caracter" })
    .max(255, { message: "El titulo debe tener como maximo 255 caracteres" });

const descripcion = texto("La descripcion es requerida", "La descripcion debe ser un string")
    .max(255, { message: "La descripcion debe tener como maximo 255 caracteres" });

export const createTareasSchema = z.object({
    titulo: titulo,
    descripcion: descripcion.optional(),
});

export const updateTareasSchema = z.object({
    titulo: titulo.optional(),
    descripcion: descripcion.optional(),
});
