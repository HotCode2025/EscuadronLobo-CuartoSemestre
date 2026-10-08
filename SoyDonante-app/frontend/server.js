const express = require('express');
const path = require('path');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.FRONTEND_PORT || 3000;
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

app.use(cors());

// 1. Proxy ALL /api requests directly to Python FastAPI backend
app.use(createProxyMiddleware({
    pathFilter: '/api',
    target: BACKEND_URL,
    changeOrigin: true,
    onError: (err, req, res) => {
        console.error('❌ Error proxy al backend Python:', err.message);
        res.status(502).json({
            error: 'Backend Python no disponible',
            details: 'Asegúrate de que uvicorn esté ejecutándose en http://localhost:8000'
        });
    }
}));

// 2. Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// 3. SPA Catch-all route serving index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🩸 Soy Donante — Frontend Node.js Servidor Activo`);
    console.log(`🌐 Aplicación Web:  http://localhost:${PORT}`);
    console.log(`🐍 Proxy Backend API: ${BACKEND_URL}/api`);
    console.log(`====================================================`);
});
