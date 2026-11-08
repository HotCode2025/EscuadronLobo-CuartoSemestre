import {z} from 'zod';

// En zod 4 los mensajes de "requerido" y "tipo incorrecto" se definen con `error`
const texto = (requerido, tipo) => z.string({
    error: (issue) => issue.input === undefined ? requerido : tipo,
});

export const signupSchema = z.object({
    name: texto("El nombre es requerido", "El nombre debe ser un string")
        .min(1, { message: "El nombre debe tener al menos 1 caracter" })
        .max(255, { message: "El nombre debe tener como maximo 255 caracteres" }),
    email: texto("El email es requerido", "El email debe ser un string")
        .email({ message: "El email debe ser un email valido" }),
    password: texto("La contraseña es requerida", "La contraseña debe ser un string")
        .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
        .max(255, { message: "La contraseña debe tener como maximo 255 caracteres" }),
});

export const signinSchema = z.object({
    email: texto("El email es requerido", "El email debe ser un string")
        .email({ message: "El email debe ser un email valido" }),
    password: texto("La contraseña es requerida", "La contraseña debe ser un string")
        .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
        .max(255, { message: "La contraseña debe tener como maximo 255 caracteres" }),
});
