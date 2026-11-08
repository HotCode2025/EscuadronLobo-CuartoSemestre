import { createContext, useState, useContext ,useEffect } from "react";
import Cookie from "js-cookie";
import axios from "../api/axios";

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(true);

  // Guarda los errores del backend siempre como una lista de textos
  const guardarErrores = (error) => {
    const data = error.response?.data;
    if (!data) {
      return setErrors(["No se pudo conectar con el servidor"]);
    }
    if (Array.isArray(data)) {
      return setErrors(data);
    }
    setErrors([data.message]);
  };

  const signin = async (data) => {
    try {
      const res = await axios.post("/signin", data);

      setUser(res.data);
      setIsAuth(true);
      return res.data;
    } catch (error) {
      guardarErrores(error);
    }
  };

  const signup = async (data) => {
    try {
      const res = await axios.post("/signup", data);
      setUser(res.data);
      setIsAuth(true);
      return res.data;
    } catch (error) {
      guardarErrores(error);
    }
  };

  const signout = async() => {
    const res = await axios.post("/signout");
    setUser(null);
    setIsAuth(false);
    return res.data;
  }

    useEffect(() => {
        // Si no hay cookie, no hay nada que esperar
        if (!Cookie.get("token")) {
            setLoading(false);
            return;
        }
        // Si hay cookie, espera la respuesta del perfil antes de dejar de cargar
        axios.get("/profile").then((res) => {
            setUser(res.data);
            setIsAuth(true);
        }).catch(() => {
            setUser(null);
            setIsAuth(false);
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    useEffect(() => {
      const timeout = setTimeout(() => {
        setErrors(null);
      }, 4000);
      return () => {
        clearTimeout(timeout);
      };
    }, [errors]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuth,
        errors,
        signup,
        setUser,
        signin,
        signout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
