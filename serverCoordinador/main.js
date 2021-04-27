const express = require('express');
const app = express();
const axios = require('axios');
const port = 3000;
const bodyParser = require('body-parser');
const logger = require('./logs/logger');
var server = require('http').Server(app);
let listaServidores = [];
let listaPalabras = [];
let listaVotos = [0, 0, 0];
var serverReq;
let listaTareasPendientes = [];
var isTime = false;
var count = 0;

const executeScripts = require('./scripts/execute-scripts');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(require('./routes/router'));
app.use(express.static('public'));

app.post('/word', (req, res) => {
	for (let i = 0; i < listaServidores.length; i++) {
		axios.get(`http://${listaServidores[i]}:8080/word`).then((response) => {
			listaPalabras.push(response.data.wordV);
			logger.info('Me llega la palabra: ' + response.data.wordV);
		});
	}
	res.sendStatus(200);
});

app.get('/list', (req, res) => {
	var miObjeto = new Object();
	miObjeto.word1 = listaPalabras[0];
	miObjeto.word2 = listaPalabras[1];
	for (let i = 0; i < listaServidores.length; i++) {
		axios
			.post(`http://${listaServidores[i]}:8080/listword`, miObjeto)
			.then((response) => {})
			.catch((error) => {
				console.log(error);
			});
	}
	res.sendStatus(200);
});

app.post('/infopixels', async (req, res) => {
	serverReq = req.body.ip;
	logger.info(`la instancia ${serverReq} desea modificar el pixel en la pos x: ${req.body.x}, y:${req.body.y} y con un color ${req.body.color}`);
	listaTareasPendientes.push('la instancia ' + req.body.ip + ' quiere modificar pixel');
	axios
		.post(`http://localhost:3000/word`) // => pide las palabras a todas las instancias
		.then((response) => {
			axios
				.get(`http://localhost:3000/list`) // => envia la lista de palabras a todas las instancias
				.then((response) => {})
				.catch((error) => {
					console.log(error);
				});
		})
		.then((response) => {})
		.catch((error) => {
			console.log(error);
		});
	if (isTime == true) {
	}

	res.send('Ok');
});

app.post('/wordV', (req, res) => {
	var pos = req.body.num;
	console.log('EL voto es para la pos ' + pos);
	if (pos == 0) {
		listaVotos[0] = listaVotos[0] + 1;
		console.log('Asi quedo el voto en la 0 ' + listaVotos[0]);
	}
	if (pos == 1) {
		listaVotos[1] = listaVotos[1] + 1;
		console.log('Asi quedo el voto en la 1 ' + listaVotos[1]);
	}
	if (pos == 2) {
		listaVotos[2] = listaVotos[2] + 1;
		console.log('Asi quedo el voto en la 2 ' + listaVotos[2]);
	}
	count = count + 1;
	if (count >= 2) {
		axios
			.get(`http://localhost:3000/task`)
			.then((response) => {})
			.catch((error) => {
				console.log(error);
			});
	}
	res.sendStatus(200);
});

app.get('/task', (req, res) => {
	var aux = 0;
	for (let i = 0; i < listaVotos.length; i++) {
		if (aux < listaVotos[i]) {
			aux = listaVotos[i];
		}
	}
	var word = listaPalabras[Number(aux)];
	console.log('La palabra que mas votos tuvo fue ' + word);
	var miObjeto = new Object();
	miObjeto.word = word;
	miObjeto.veces = 5000;
	listaTareasPendientes.push(serverReq + ':' + word + ':' + 5000);
	axios
		.post(`http://${serverReq}:8080/task`, miObjeto) // => pide las palabras a todas las instancias
		.then((response) => {})
		.catch((error) => {
			console.log(error);
		});
	res.sendStatus(200);
});

setTimeout(() => {
	axios
		.get(`http://localhost:3000/instance`)
		.then((response) => {
			var aux = response.data;
			listaServidores = Object.values(aux);
			showList();
		})
		.catch((error) => {
			console.log(error);
		});
}, 5000);

setInterval(() => {
	for (let i = 0; i < listaTareasPendientes.length; i++) {
		console.log(listaTareasPendientes[i]);
	}
}, 5000);

//Metodo encargado de mostrar la lista
function showList() {
	console.log('Lista de instancias: ');
	for (let i = 0; i < listaServidores.length; i++) {
		console.log(listaServidores[i]);
	}
}

//Metodo encargado de mostrar la lista
function showVotes() {
	console.log('lista de Votos');
	for (let i = 0; i < listaVotos.length; i++) {
		console.log(listaVotos[i]);
	}
}

/**
 * Obtiene los logs la instancia especificada en instancenum (2,3,4)
 */
app.get('/logs/:instancenum', (req, res) => {
	let ip = `172.17.0.${req.params.instancenum}`;
	axios
		.get(`http://${ip}:8080/logs`)
		.then((logsArray) => {
			logger.info(`Peticion de logs a instance ${ip}`);
			res.send(logsArray.data);
		})
		.catch((error) => {
			logger.error(`Al traer logs: ${error.message}`);
			res.send([]);
		});
});

server.listen(port, () => {
	logger.info(`Middleware listening on port ${port}`);
});
