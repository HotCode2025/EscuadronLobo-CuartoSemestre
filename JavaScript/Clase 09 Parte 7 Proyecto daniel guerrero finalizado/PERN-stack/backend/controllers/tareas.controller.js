import { pool } from '../db.js';

export const listarTareas = async (req, res) => {
    const resultado = await pool.query('SELECT * FROM tareas WHERE usuario_id = $1', [req.usuarioId]);
    return res.json(resultado.rows);
}
export const listarTarea = async (req, res) => {
    // Solo devuelve la tarea si es del usuario que tiene la sesion
    const resultado = await pool.query('SELECT * FROM tareas WHERE id = $1 AND usuario_id = $2', [req.params.id, req.usuarioId]);
    if (resultado.rowCount === 0) {
        return res.status(404).json({
            message: 'La tarea no existe'
        });
    }
    return res.json(resultado.rows[0]);
}


export const crearTarea = async (req, res, next) => {
    const { titulo, descripcion } = req.body;


    try {

        const result = await pool.query('INSERT INTO tareas ( titulo, descripcion, usuario_id ) VALUES ($1, $2, $3) RETURNING *', [titulo, descripcion, req.usuarioId]);
        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                message: 'Ya existe una tarea con ese titulo'
                });
        }
        next(error);
    }
};

export const actualizarTarea = async (req, res, next) => {
    const { titulo, descripcion } = req.body;
    const id = req.params.id;
    try {
        // COALESCE: si un campo no viene, deja el valor que ya tenia
        const result = await pool.query(
            'UPDATE tareas SET titulo = COALESCE($1, titulo), descripcion = COALESCE($2, descripcion) WHERE id = $3 AND usuario_id = $4 RETURNING *',
            [titulo, descripcion, id, req.usuarioId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: 'No existe una tarea con ese id'
            });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                message: 'Ya existe una tarea con ese titulo'
            });
        }
        next(error);
    }
}

export const eliminarTarea = async (req, res) => {
    const resultado = await pool.query('DELETE FROM tareas WHERE id = $1 AND usuario_id = $2', [req.params.id, req.usuarioId]);

    if (resultado.rowCount === 0) {
        return res.status(404).json({
            message: 'No existe una tarea con ese id'
        });
    }
    return res.sendStatus(204);
}
