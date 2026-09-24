package utn.estudiantes;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import utn.estudiantes.modelo.Estudiantes2026;
import utn.estudiantes.servicio.EstudianteServicio;

import java.util.List;
import java.util.Scanner;

@SpringBootApplication
public class EstudiantesApplication implements CommandLineRunner {

	@Autowired
	private EstudianteServicio estudianteServicio;
	private static final Logger logger = LoggerFactory.getLogger(EstudiantesApplication.class);

	String nl = System.lineSeparator();

	public static void main(String[] args) {
		String nl = System.lineSeparator();
		logger.info("Iniciando la Aplicación...");
		//Levantar fabrica de Spring
		SpringApplication.run(EstudiantesApplication.class, args);
		logger.info("Aplicación Finalizada" + nl);
	}

	@Override
	public void run(String... args) throws Exception {
		logger.info(nl + "Ejecutando el método run de Spring" + nl);
		var salir = false;
		var consola = new Scanner(System.in);
		while(!salir){
			mostrarMenu();
			salir = ejecutarOpciones(consola);
			logger.info(nl);
		}//fin ciclo while
	}

	private void mostrarMenu(){
		//logger.info(nl);
		logger.info("""
				******* Sistema de Estudiantes 2026 *******
				1- Listar Estudiantes
				2- Buscar Estudiante
				3- Agregar Estudiante
				4- Modificar Estudiante
				5- Eliminar Estudiante
				6- Salir
				Elija una opcion: """);
	}

	private boolean ejecutarOpciones(Scanner consola){
		var opcion = 0;
		var salir = false;
		boolean error = true;

		while (error) {
			try {
				opcion = Integer.parseInt(consola.nextLine());
				error = false;
			} catch (Exception e) {
				logger.info("Opcion inválida! Intenta nuevamente" + nl + nl);
				mostrarMenu();
				error = true;
			}
		}
		switch (opcion) {
			case 1 -> { //Listar Estudiantes
				logger.info(nl + "Listado de Estudiantes:" + nl);
				List<Estudiantes2026> estudiantes = estudianteServicio.listarEstudiantes();
				estudiantes.forEach(estudiante -> logger.info(estudiante.toString() + nl));
			}
			case 2 -> { //Buscar Estudiante por ID
				logger.info(nl + "Ingrese el ID del Estudiante a buscar: ");
				var idEstudiante = Integer.parseInt(consola.nextLine());
				Estudiantes2026 estudiante = estudianteServicio.buscarEstudiantePorId(idEstudiante);
				if(estudiante != null)
					logger.info("Estudiante encontrado: "+ estudiante + nl);
				else
					logger.info("Estudiante NO encontrado: " + idEstudiante + nl);
			}
			case 3 -> { //Agregar Estudiante
				logger.info("Agregar Estudiante: " + nl);
				logger.info("Nombre: ");
				var nombre = consola.nextLine();
				logger.info("Apellido: ");
				var apellido = consola.nextLine();
				logger.info("Telefono: ");
				var telefono = consola.nextLine();
				logger.info("Email: ");
				var email = consola.nextLine();
				// Crear objeto estudiante sin el ID
				var estudiante = new Estudiantes2026();
				estudiante.setNombre(nombre);
				estudiante.setApellido(apellido);
				estudiante.setTelefono(telefono);
				estudiante.setEmail(email);
				estudianteServicio.guardarEstudiante(estudiante);
				logger.info(nl + "Estudiante agregado: " + estudiante + nl);
			}
			case 4 -> { //Modificar Estudiante
				logger.info("Modificar Estudiante: " + nl);
				logger.info("Ingrese el ID del Estudiante a modificar: ");
				var idEstudiante = Integer.parseInt(consola.nextLine());
				//Buscamos el estudiante
				Estudiantes2026 estudiante = estudianteServicio.buscarEstudiantePorId(idEstudiante);
				if (estudiante != null) {
					logger.info("Nombre: ");
					var nombre = consola.nextLine();
					logger.info("Apellido: ");
					var apellido = consola.nextLine();
					logger.info("Telefono: ");
					var telefono = consola.nextLine();
					logger.info("Email: ");
					var email = consola.nextLine();
					estudiante.setNombre(nombre);
					estudiante.setApellido(apellido);
					estudiante.setTelefono(telefono);
					estudiante.setEmail(email);
					estudianteServicio.guardarEstudiante(estudiante);
					logger.info("Estudiante modificado: " + estudiante + nl);
				}
				else {
					logger.info("Estudiante NO encontrado: " + idEstudiante + nl);
				}
			}
			case 5 -> { //Eliminar Estudiante
				logger.info("Eliminar Estudiante: " + nl);
				logger.info("Ingrese el ID del Estudiante a eliminar: ");
				var idEstudiante = Integer.parseInt(consola.nextLine());
				//Buscamos el estudiante
				Estudiantes2026 estudiante = estudianteServicio.buscarEstudiantePorId(idEstudiante);
				if (estudiante != null) {
					estudianteServicio.eliminarEstudiante(estudiante);
					logger.info("Estudiante eliminado: " + estudiante + nl);
				}
				else {
					logger.info("Estudiante NO encontrado: " + idEstudiante + nl);
				}
			}
			case 6 -> { //Salir
				logger.info("Hasta pronto!" + nl + nl);
				salir = true;
			}
            default ->  {
				logger.info("Opcion Incorrecta: " + opcion + nl);
				salir = false;
			}
		}//fin switch
		return salir;
	}
}
