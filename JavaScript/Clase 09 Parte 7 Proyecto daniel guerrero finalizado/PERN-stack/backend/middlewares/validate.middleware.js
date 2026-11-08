
export const validateSchema = (schema) => async (req , res , next) => {
    try {
        await schema.parse(req.body)
        next()
    } catch (error) {
        if (Array.isArray(error.issues)) {
            return res.status(400).json(error.issues.map((error) => error.message))
        }
        // Si no es un error de validacion, lo manda al manejador de errores
        next(error)
    }
}
