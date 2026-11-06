async function hola(nombre){
    return new Promise(function (resolve, reject) {
        setTimeout( function () {
            console.log('Hola '+nombre);
            resolve(nombre);
        }, 1000);
    });
}

async function hablar(nombre){
    return new Promise( (resolve, reject) => {
        setTimeout( function () {
            console.log('bla bla bla bla');
            resolve(nombre);
        }, 1000);
    });
}

async function adios(nombre) {
    return new Promise((resolve, reject) => {
        //validamos el error o aprobacion
        setTimeout(function() {
            console.log('Adios ' + nombre);
            //if (err) reject("Hay un error");
            resolve();
        }, 1000);
    });
}

//await hola("Ariel"); // esto es mala sintaxis

async function main() {
    let nombre = await hola('Ariel');
    await hablar();
    await hablar();
    await hablar();
    await adios(nombre);
    console.log('Terminamos el proceso...');
}

console.log('Empezamos el proceso...');
main();
console.log('Esta va a ser la segunda instrucción');

//Codigo en ingles
//Es asincrono y retorna una promesa
async function sayHello(name){
    return new Promise(function (resolve, reject) {
        setTimeout( function () {
            console.log('Hello '+ name);
            resolve(name);
        }, 1000);
    });
}

async function talk(name){
    return new Promise( (resolve, reject) => {
        setTimeout( function () {
            console.log('bla bla bla bla');
            resolve(name);
        }, 1000);
    });
}

async function sayBye(name) {
    return new Promise((resolve, reject) => {
        setTimeout(function() {
            console.log('Goodbye ' + name);
            resolve(name);
        }, 1000);
    });
}

async function conversation(name) {
    console.log('Starting the async process...');
    await sayHello(name);
    await talk();
    await talk();
    await talk();
    await sayBye(name);
    console.log('Process completed');
}

conversation('Ariel');
