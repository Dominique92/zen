/* jshint esversion: 6 */
if (window.DeviceOrientationEvent && 'ontouchstart' in window) { // Si mobile
	document.body.classList.add('is-mobile');

	console.log = function(message) {
		alert(message);
	};
}

//****************************************************************
// Ecran d'accueil, activations nécéssitant une action utilisateur
const bouton_el = document.getElementById('bouton');
var audioContext;

function flip() {
	if (!audioContext) {
		document.body.classList.add('run');
		bouton_el.src = bouton_el.src.replace('start', 'stop');
		audioContext = new(window.AudioContext || window.webkitAudioContext)();
		randomSound(true);
	} else {
		bouton_el.src = bouton_el.src.replace('stop', 'start');
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

// Enlève les doublons
for (let i in liaisons)
	liaisons[i] = Array.from(new Set(liaisons[i]));

// Delta d'orientation (angle ° par seconde)
const doCalme = 0.05, // Sur un corps inerte / détendu
	doActif = 0.5, // Mobile qui bouge

	// Délais en secondes 
	tCalme = 15, // Entre les changements de son, posé sur un support fixe
	inactif = 15, // Non sensibilité aux mouvements au début

	// Probibilités
	permutMain = 0.1, // Probibilité d'échanger le premier et le second lors de chaque émission de son
	permutMainMax = 0.2, // Probibilité max d'échanger le premier et le second
	sonMainSecond = 0.2, // Probabilité de diffuser le second

	// Elements HTML
	traceTag = document.getElementById('trace');

// Valeurs variables
var main = 'champs',
	second = 'foret',
	son = randomArray(sons[main]),
	dateDebut; // Du lancement des sons

setInterval(randomSound, 1000);

function randomSound(reset) {
	if (reset)
		dateDebut = Date.now(); // Du lancement du programme

	if (audioContext) {
		const orientation = deltaOrientation(),
			probChange = Math.max(
				(1 - orientation / doCalme) / tCalme,
				1 - doActif / orientation
			);

		// Choix du son diffusé (main/second)
		if (Math.random() < Math.min(probChange, permutMainMax) || reset) {
			const nom = Math.random() > sonMainSecond ? main : second;
			son = randomArray(sons[nom]);
			mp3(son);

			// Echange main/second
			if (Math.random() < permutMain &&
				Date.now() - dateDebut > inactif * 1000) {
				main = second;
				second = randomArray(liaisons[main]);
			}
		}

		// Trace
		if (traceTag)
			traceTag.innerHTML = [
				main,
				second,
				(son.match('([a-z-]+)\\\.'))[1],
				//'orientation ' + orientation,
				Math.max(0, probChange),
			].join('<br/>');
	}
}

function randomArray(a) {
	return a[Math.floor(Math.random() * a.length)];
}

// Joue un fichier MP3
function mp3(file) {
	// Declare audio nodes
	const source = audioContext.createBufferSource(),
		panner = audioContext.createPanner(),
		gainNode = audioContext.createGain();

	// Connect nodes
	source.connect(panner);
	panner.connect(gainNode);
	gainNode.connect(audioContext.destination);

	// Set position
	const angle = Math.random() * 2 * Math.PI;
	panner.setPosition(Math.sin(angle), 0, Math.cos(angle));
	// panner.setPosition(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);

	// Load the file
	window.fetch(file)
		.then(function(response) {
			return response.arrayBuffer();
		})
		.then(function(arrayBuffer) {
			return audioContext.decodeAudioData(arrayBuffer);
		})
		.then(function(audioBuffer) {
			source.buffer = audioBuffer;

			// Ramp up over 5% of the duration
			gainNode.gain.value = 0;
			source.start();
			gainNode.gain.linearRampToValueAtTime(
				1,
				Math.max(2, // max ramp up 2 seconds
					audioContext.currentTime + audioBuffer.duration / 20)
			);

			// Ramp down over last 10% of time
			setTimeout(function() {
				this.gainNode.gain.linearRampToValueAtTime(
					0,
					audioContext.currentTime + this.audioBuffer.duration / 10
				);
			}.bind({ // Locally use values of this source
				audioBuffer: audioBuffer,
				gainNode: gainNode,
			}), audioBuffer.duration * 900);
		});
	return source;
}