/* jshint esversion: 6 */
if (window.DeviceOrientationEvent && 'ontouchstart' in window) { // Si mobile
	document.body.classList.add('is-mobile');

	console.log = function(message) {
		alert(message);
	};
}

//****************************************************************
// Ecran d'accueil, activations nécéssitant une action utilisateur
var date, // Lancement du programme
	audioContext;

function flip() {
	const flipImg = document.getElementById('flip');
	if (!audioContext) {
		document.body.classList.add('run');
		flipImg.src = flipImg.src.replace('start', 'stop');
		date = Date.now(); // Lancement du programme
		audioContext = new(window.AudioContext || window.webkitAudioContext)();
		randomSound(true);
	} else {
		flipImg.src = flipImg.src.replace('stop', 'start');
		document.body.classList.remove('run');
		audioContext.close();
		audioContext = null;
	}
}

//**********************
// Mesure de l'orientation (angle dans l'espace)
var deviceOrientation = {},
	lastOrientation = {};

// Actualise l'orientation quand elle change
window.addEventListener('deviceorientation', function(evt) {
	deviceOrientation = evt;
});

function derive(k) {
	let dor = deviceOrientation[k] - lastOrientation[k];
	if (dor < 180) dor += 360;
	if (dor > 180) dor -= 360;
	return isNaN(dor) ? 0 :
		Math.abs(dor);
}

// Récupère l'oriention depuis la dernière fois (en °)
function deltaOrientation() {
	const r = Math.hypot(Math.hypot(derive('alpha'), derive('beta')), derive('gamma'));
	lastOrientation = deviceOrientation;
	return r;
}

//*******************
// Diffusion des sons
const delai = 8, // (secondes) entre chaque changement de son
	ems_r = 0.1 / delai, // Probabilité d'échanger main/second au repos (secondes)
	es_c = 0.2 / delai, // Probabilité d'échanger second au repos et calme
	ps_ms = 0.2, // Probabilité de diffuser le second
	r_bc = 0.05, // Limite basse orientation au calme
	r_hc = 3, // Limite haute orientation au calme
	r_ha = 15; // Limite haute orientation agitée

var main = 'champs',
	second = 'foret',
	son = randomArray(sons[main]),
	compteur = delai;

// Enlève les doublons
for (let i in liaisons)
	liaisons[i] = Array.from(new Set(liaisons[i]));

setInterval(randomSound, 1000);

function randomSound(reset) {
	if (audioContext) {
		if (reset)
			compteur = delai; // On change le son tout de suite

		const orientation = deltaOrientation(),
			// Probabilité d'échanger main/second
			p_ms = Math.max(ems_r * (1 - orientation / r_bc), (orientation - r_hc) / (r_ha - r_hc)),
			// Probabilité d'échanger second
			p_es = Math.max(es_c, (orientation - r_hc) / (r_ha - r_hc));

		// Echange main/second
		if (Math.random() < p_ms && Date.now() - date > 15000) {
			const tmp = main;
			main = second;
			second = tmp;
			compteur = delai; // On change le son tout de suite
		}

		// Randomisation du second
		if (Math.random() < p_es && Date.now() - date > 30000)
			second = randomArray(liaisons[main]);

		// Choix du son diffusé (main/second)
		if (compteur++ >= delai) {
			const nom = Math.random() > ps_ms ? main : second;
			son = randomArray(sons[nom]);
			mp3(son);
			compteur = 0;
		}
		const traceTag = document.getElementById('trace');
		if (0 && traceTag)
			traceTag.innerHTML = [
				main,
				second,
				son,
				'orientation ' + orientation,
				'p_ms ' + p_ms,
				'p_es ' + p_es,
			].join('<br/>');
	}
}

function randomArray(a) {
	return a[Math.floor(Math.random() * a.length)];
}

// Joue un fichier MP3
//TODO entrée et sortie progressive
function mp3(file) {
	const source = audioContext.createBufferSource(),
		panner = audioContext.createPanner();
	panner.connect(audioContext.destination);
	source.connect(panner);

	const angle = Math.random() * 2 * Math.PI;
	panner.setPosition(Math.sin(angle), 0, Math.cos(angle));
	//	panner.setPosition(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);

	window.fetch(file)
		.then(function(response) {
			return response.arrayBuffer();
		})
		.then(function(arrayBuffer) {
			return audioContext.decodeAudioData(arrayBuffer);
		})
		.then(function(audioBuffer) {
			source.buffer = audioBuffer;
			source.start();
		});
	return source;
}