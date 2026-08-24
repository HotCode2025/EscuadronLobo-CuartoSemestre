package UTN.presentacion;

import UTN.datos.EstudianteDAO;
import UTN.dominio.Estudiante;

import java.util.Scanner;

/**
 * Clase principal que gestiona la interfaz de usuario por consola (Capa de Presentación).
 * Se encarga de solicitar los datos de entrada y procesar la interacción con el usuario.
 */
public class SistemaEstudiantesApp {

    public static void main(String[] args) {
        var salir = false; // Controla la continuidad del ciclo principal del programa
        var consola = new Scanner(System.in); // Instancia única para la lectura de datos desde la consola

        // Se instancia la capa de datos (DAO). Una sola instancia maneja las operaciones de base de datos.
        var estudianteDao = new EstudianteDAO();

        // Ciclo principal de ejecución de la aplicación
        while(!salir) {
            try {
                mostrarMenu();
                salir = ejecutarOpciones(consola, estudianteDao);
            } catch (Exception e) {
                // Captura genérica para evitar que el programa se detenga ante errores de entrada o ejecución
                System.out.println("Ocurrió un error al ejecutar la opción: " + e.getMessage());
            }
            System.out.println(); // Espaciado visual entre iteraciones del menú
        }//Fin while
    }//Fin main

    /**
     * Muestra en consola el menú de opciones disponibles empleando Text Blocks (Java 15+).
     */
    private static void mostrarMenu() {
        System.out.print("""
                *** Sistema de Estudiante ***
                1. Listar estudiante
                2. Buscar estudiante
                3. Agregar estudiante
                4. Modificar estudiante
                5. Eliminar estudiante
                6. Salir
                Elige una opción:\s""");
    }

    /**
     * Evalúa la opción elegida por el usuario y ejecuta la operación correspondiente en la base de datos.
     *
     * @param consola Instancia de Scanner para captura de datos.
     * @param estudianteDao Objeto para la persistencia y acceso a datos.
     * @return boolean Devuelve true si el usuario seleccionó la opción de salir; de lo contrario, false.
     */
    private static boolean ejecutarOpciones(Scanner consola, EstudianteDAO estudianteDao) {
        var opcion = Integer.parseInt(consola.nextLine());
        var salir = false;

        switch (opcion) {
            case 1 -> { // 1. Listar todos los estudiantes
                System.out.println("--- Listado de Estudiantes ---");// Imprime solo el título descriptivo en la pantalla

                // 1. Busca los datos en la BD y los guarda en la variable (aún NO los imprime en pantalla)
                var estudiantes = estudianteDao.listarEstudiantes();

                // 2. Recorre la lista elemento por elemento y los imprime uno a uno en la consola
                estudiantes.forEach(estudiante -> System.out.println(estudiante));
            }//Fin clase 1

            case 2 -> { // 2. Buscar un estudiante por ID
                System.out.print("Introduce el id del estudiante: ");
                var idEstudiante = Integer.parseInt(consola.nextLine());
                var estudiante = new Estudiante(idEstudiante);
                var encontrado = estudianteDao.buscarEstudiantePorId(estudiante);

                if (encontrado) {
                    System.out.println("Estudiante encontrado: " + estudiante);
                } else {
                    System.out.println("Estudiante NO encontrado con id: " + idEstudiante);
                }
            }//Fin clase 2

            case 3 -> { // 3. Insertar un nuevo registro de estudiante
                System.out.print("Nombre: ");
                var nombre = consola.nextLine();
                System.out.print("Apellido: ");
                var apellido = consola.nextLine();
                System.out.print("Teléfono: ");
                var telefono = consola.nextLine();
                System.out.print("Email: ");
                var email = consola.nextLine();

                // Creación del objeto de dominio sin el ID (se autogenera en la BD)
                var estudiante = new Estudiante(nombre, apellido, telefono, email);
                var agregado = estudianteDao.agregarEstudiante(estudiante);

                if (agregado) {
                    System.out.println("Estudiante agregado: " + estudiante);
                } else {
                    System.out.println("No se pudo agregar el estudiante");
                }
            }//Fin clase 3

            case 4 -> { // 4. Modificar los datos de un estudiante existente
                System.out.print("Id Estudiante: ");
                var idEstudiante = Integer.parseInt(consola.nextLine());
                System.out.print("Nombre: ");
                var nombre = consola.nextLine();
                System.out.print("Apellido: ");
                var apellido = consola.nextLine();
                System.out.print("Teléfono: ");
                var telefono = consola.nextLine();
                System.out.print("Email: ");
                var email = consola.nextLine();

                // Objeto con ID para identificar el registro a actualizar en la BD
                var estudiante = new Estudiante(idEstudiante, nombre, apellido, telefono, email);
                var modificado = estudianteDao.modificarEstudiante(estudiante);

                if (modificado) {
                    System.out.println("Estudiante modificado: " + estudiante);
                } else {
                    System.out.println("No se pudo modificar el estudiante");
                }
            }//Fin clase 4

            case 5 -> { // 5. Eliminar un registro de estudiante por ID
                System.out.print("Introduce el id del estudiante a eliminar: ");
                var idEstudiante = Integer.parseInt(consola.nextLine());
                var estudiante = new Estudiante(idEstudiante);
                var eliminado = estudianteDao.eliminarEstudiante(estudiante);

                if (eliminado) {
                    System.out.println("Estudiante eliminado: " + estudiante);
                } else {
                    System.out.println("No se pudo eliminar el estudiante");
                }
            }//Fin clase 5

            case 6 -> { // 6. Finalizar el ciclo de la aplicación
                System.out.println("Hasta pronto...");
                salir = true;
            }//Fin clase 6
            default -> System.out.println("Opción no reconocida, ingrese otra opción: " + opcion);
        }//Fin switch
        return salir;
    }
}//Fin clase