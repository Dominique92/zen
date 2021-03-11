/* jshint esversion: 6 */

// Si mobile
if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
	// Présentation mobile
	document.body.classList.add('is-mobile');

	// Debug
	console.log = function(message) {
		alert(message);
	};
}

//****************************************************************
// Home screen, activations requiring a user action
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
var traceEl = document.getElementById('trace'),
	mainSoundCategory = 'foret', // Nom de la catégorie de sons jouée
	secondSoundCategory = 'champs', // Nom de la catégorie de sons en attente
	currentSoundName = randomArray(sons[mainSoundCategory]), // Initialisation du premier son
	dateDebut, // Du lancement des sons
	buffers = []; // List of end playing sounds date


// Enlève les doublons
for (let i in liaisons)
	liaisons[i] = Array.from(new Set(liaisons[i]));

setInterval(randomSound, 1000);

function randomSound(reset) {
	// Date du lancement du programme
	if (reset)
		dateDebut = Date.now();

	if (audioContext) {
		// Fliter & count the active sounds
		buffers = buffers.filter(b => b > Date.now());

		let movement = Date.now() < dateDebut + 15 * 1000 ? // Insensitive to movements the first 15 seconds
			0 :
			deltaOrientation(), // Delta orientation from last measure
			soundNbObjective = movement < 0.05 ? 1 : movement; // If stay motionless, always play one sound

		// Add one sound
		if (0.5 + buffers.length < soundNbObjective) {
			const soundCategory = Math.random() > 0.2 ? mainSoundCategory : secondSoundCategory;
			currentSoundName = randomArray(sons[soundCategory]);
			playMp3(currentSoundName);
		}

		// Exange mainSoundCategory/secondSoundCategory
		if (Math.random() < movement * movement / 30 + 0.1) {
			const exmsc = mainSoundCategory;
			mainSoundCategory = secondSoundCategory;
			secondSoundCategory = Math.random() < 0.3 ?
				secondSoundCategory = randomArray(liaisons[mainSoundCategory]) :
				exmsc;
		}

		// Trace
		if (traceEl)
			traceEl.innerHTML = [
				mainSoundCategory,
				secondSoundCategory,
				(currentSoundName.match('([a-z-]+)\\\.'))[1],
				'movement ' + Math.round(movement * 100) / 100,
				'nb sounds ' + buffers.length,
			].join('<br/>');
	}
}

function randomArray(a) {
	return a[Math.floor(Math.random() * a.length)];
}

// Play a MP3 file
//TODO loop on background sounds
function playMp3(fileName) {
	// Declare audio nodes
	const source = audioContext.createBufferSource(),
		panner = audioContext.createPanner(),
		gainNode = audioContext.createGain();

	// Connect nodes
	source.connect(panner);
	panner.connect(gainNode);
	gainNode.connect(audioContext.destination);

	// Set random position
	panner.setPosition(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1); // Sur une shère

	// Load the file
	window.fetch(fileName)
		.then(function(response) {
			return response.arrayBuffer();
		})
		.then(function(arrayBuffer) {
			return audioContext.decodeAudioData(arrayBuffer);
		})
		.then(function(audioBuffer) {
			// Connect the audioBuffer to the source
			source.buffer = audioBuffer;

			//Play the sounds following the curve
			source.start();
			gainNode.gain.setValueCurveAtTime(
				[0, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.75, 0.5, 0],
				audioContext.currentTime,
				audioBuffer.duration
			);

			// Trace currently available sounds
			//TODO trace list of sounds names
			buffers.push(Date.now() + audioBuffer.duration * 1000);
		});
}