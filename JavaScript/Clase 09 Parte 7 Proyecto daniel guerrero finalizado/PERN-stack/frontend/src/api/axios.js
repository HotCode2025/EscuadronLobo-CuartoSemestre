import axios from "axios";

// En produccion se usa la variable VITE_BACKEND (la direccion del backend en Railway)
const baseURL = import.meta.env.VITE_BACKEND || "http://localhost:3000/api";

const cliente = axios.create({
    baseURL,
    withCredentials: true,
});

export default cliente;
