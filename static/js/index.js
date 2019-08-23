/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var ws = new WebSocket('wss://' + location.host + '/one2one');
var videoInput;
var videoOutput;
var localVideo;
var remoteVideo;
var webRtcPeer;

var registerName = null;
const NOT_REGISTERED = 0;
const REGISTERING = 1;
const REGISTERED = 2;
var registerState = null



function setRegisterState(nextState) {
	switch (nextState) {
	case NOT_REGISTERED:
		$('#register').attr('disabled', false);
		$('#call').attr('disabled', true);
		$('#terminate').attr('disabled', true);
		break;

	case REGISTERING:
		$('#register').attr('disabled', true);
		break;

	case REGISTERED:
		$('#register').attr('disabled', true);
		setCallState(NO_CALL);
		break;

	default:
		return;
	}
	registerState = nextState;
}

const NO_CALL = 0;
const PROCESSING_CALL = 1;
const IN_CALL = 2;
var callState = null

function setCallState(nextState) {
	switch (nextState) {
	case NO_CALL:
		$('#call').attr('disabled', false);
		$('#terminate').attr('disabled', true);
		break;

	case PROCESSING_CALL:
		$('#call').attr('disabled', true);
		$('#terminate').attr('disabled', true);
		break;
	case IN_CALL:
		$('#call').attr('disabled', true);
		$('#terminate').attr('disabled', false);
		break;
	default:
		return;
	}
	callState = nextState;
}

window.onload = function() {
	console = new Console();
	setRegisterState(NOT_REGISTERED);
	var drag = new Draggabilly(document.getElementById('videoSmall'));
	videoInput = document.getElementById('videoInput');
	videoOutput = document.getElementById('videoOutput');

	var v_drag = new Draggabilly(document.getElementById('v_small'));

	document.getElementById('name').focus();

	document.getElementById('register').addEventListener('click', function() {
		register();
	});
	document.getElementById('call').addEventListener('click', function() {
		call();
	});
	document.getElementById('terminate').addEventListener('click', function() {
		stop();
	});
	document.getElementById('startButton').addEventListener('click', function() {
		inicio();
	});
	document.getElementById('callButton').addEventListener('click', function(){
		ligar(true);	
	});
	document.getElementById('hangupButton').addEventListener('click', function() {
		parar();
	});
}

window.onbeforeunload = function() {
	ws.close();
}


// ######### ALTERAÇÕES - INICIO #########

var configuration = {
	'iceServers': [
	  {'urls': 'stun:stun.stunprotocol.org:3478'},
	  {'urls': 'stun:stun.l.google.com:19302'},
	]
  };
var peerConnection;
var serverConnection;
let localStream = null;
var uuid;
var my_name;
var other_name;

async function inicio(){
	console.log('Requesting local stream');
	uuid = createUUID();
	localVideo = document.getElementById('localVideo');
	remoteVideo = document.getElementById('remoteVideo');
	
	var constraints = {audio: false, video: true};

	var stream = await navigator.mediaDevices.getUserMedia(constraints);
	getUserMediaSuccess(stream);

}

function getUserMediaSuccess(stream) {
	localStream = stream;
	localVideo.srcObject = stream;
}

function ligar(isCaller){
	my_name = document.getElementById('name').value;
	other_name = document.getElementById('peer').value;

	peerConnection = new RTCPeerConnection(configuration);
	peerConnection.onicecandidate = gotIceCandidate;
  	peerConnection.ontrack = gotRemoteStream;
  	peerConnection.addStream(localStream);
	
	if(isCaller) {
		peerConnection.createOffer().then(createdDescription).catch(errorHandler);
	}

}

function createdDescription(description) {
	console.log('got description');
  
	peerConnection.setLocalDescription(description).then(function() {
		var msg = {
			'id': 'peer-to-peer',
			'my_name': my_name,
			'other_name': other_name,
			'sdp': peerConnection.localDescription,
			'uuid': uuid
		}
		sendMessage(msg);
	}).catch(errorHandler);
}

/*
function parar(){}
*/

/*
function p2p_call_incoming_response(message){
	pc.setRemoteDescription(message.sdpAnswer);
}
*/

/*
function p2p_call_incoming(message){

	RTCSessionDescription(message.sdpOffer);

	// configurando descrição do chamador.
	pc.setRemoteDescription(message.sdpOffer);
	
	// criando resposta.
	pc.createAnswer().then(function(answer) {
		
		// atualizando descrição local.
		pc.setLocalDescription(answer);
		
		// gerando mensagem de resposta do receptor
		var mensagem = {
			id: 'p2p_call_incoming_response',
			from: message.from,
			sdpOffer: answer
		};

		// enviando resposta.
		sendMessage(mensagem);

	  });

}
*/

function errorHandler(error) {
	console.log(error);
}

function gotIceCandidate(event) {
	if(event.candidate != null) {
		var msg = {
			'id': 'peer-to-peer',
			'my_name': my_name,
			'other_name': other_name,
			'ice': event.candidate,
			'uuid': uuid
		};
		sendMessage(msg);
	}
}

function gotRemoteStream(event) {
	console.log('got remote stream');
	remoteVideo.srcObject = event.streams[0];
}

function createUUID() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function gotMessageFromServer(message) {
	console.log("recebi msg do servidor: " + message);
	if(!peerConnection) ligar(false);
	// Ignore messages from ourself
	if(message.uuid == uuid) return;

	if(message.sdp) {
		peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp)).then(function() {
			// Only create answers in response to offers
			if(message.sdp.type == 'offer') {
				peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
			}
		}).catch(errorHandler);
	} else if(message.ice) {
		peerConnection.addIceCandidate(new RTCIceCandidate(message.ice)).catch(errorHandler);
	}
}

// ######### ALTERAÇÕES #########


ws.onmessage = function(message) {

	var parsedMessage = JSON.parse(message.data);
	console.info('Received message: ' + message.data);

	switch (parsedMessage.id) {
	case 'registerResponse':
		resgisterResponse(parsedMessage);
		break;
	case 'callResponse':
		callResponse(parsedMessage);
		break;
	case 'incomingCall':
		incomingCall(parsedMessage);
		break;
	case 'startCommunication':
		startCommunication(parsedMessage);
		break;
	case 'stopCommunication':
		console.info("Communication ended by remote peer");
		stop(true);
		break;
	case 'iceCandidate':
		webRtcPeer.addIceCandidate(parsedMessage.candidate)
		break;
	case 'p2p_call_incoming':
		p2p_call_incoming(parsedMessage);
		break;
	case 'p2p_call_incoming_response':
		p2p_call_incoming_response(parsedMessage);
		break;
	case 'peer-to-peer':
		gotMessageFromServer(parsedMessage);
		break;
	default:
		console.error('Unrecognized message', parsedMessage);
		break;
	}

}


function resgisterResponse(message) {
	if (message.response == 'accepted') {
		setRegisterState(REGISTERED);
	} else {
		setRegisterState(NOT_REGISTERED);
		var errorMessage = message.message ? message.message
				: 'Unknown reason for register rejection.';
		console.log(errorMessage);
		alert('Error registering user. See console for further information.');
	}
}

function callResponse(message) {
	if (message.response != 'accepted') {
		console.info('Call not accepted by peer. Closing call');
		var errorMessage = message.message ? message.message
				: 'Unknown reason for call rejection.';
		console.log(errorMessage);
		stop(true);
	} else {
		setCallState(IN_CALL);
		webRtcPeer.processAnswer(message.sdpAnswer);
	}
}

function startCommunication(message) {
	setCallState(IN_CALL);
	webRtcPeer.processAnswer(message.sdpAnswer);
}

function incomingCall(message) {
	// If bussy just reject without disturbing user
	if (callState != NO_CALL) {
		var response = {
			id : 'incomingCallResponse',
			from : message.from,
			callResponse : 'reject',
			message : 'bussy'

		};
		return sendMessage(response);
	}

	setCallState(PROCESSING_CALL);
	if (confirm('User ' + message.from
			+ ' is calling you. Do you accept the call?')) {
		showSpinner(videoInput, videoOutput);

		var options = {
			localVideo : videoInput,
			remoteVideo : videoOutput,
			onicecandidate : onIceCandidate,
		}

		webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options,
				function(error) {
					if (error) {
						console.error(error);
						setCallState(NO_CALL);
					}

					this.generateOffer(function(error, offerSdp) {
						if (error) {
							console.error(error);
							setCallState(NO_CALL);
						}
						var response = {
							id : 'incomingCallResponse',
							from : message.from,
							callResponse : 'accept',
							sdpOffer : offerSdp
						};
						sendMessage(response);
						console.log("--> resultado da ligação...");
						console.log(response);
					});
				});

	} else {
		var response = {
			id : 'incomingCallResponse',
			from : message.from,
			callResponse : 'reject',
			message : 'user declined'
		};
		sendMessage(response);
		stop(true);
	}
}

function register() {
	var name = document.getElementById('name').value;
	if (name == '') {
		window.alert("You must insert your user name");
		return;
	}

	setRegisterState(REGISTERING);

	var message = {
		id : 'register',
		name : name
	};
	sendMessage(message);

	document.getElementById('peer').focus();
}

function call() {
	if (document.getElementById('peer').value == '') {
		window.alert("You must specify the peer name");
		return;
	}

	setCallState(PROCESSING_CALL);

	showSpinner(videoInput, videoOutput);

	var options = {
		localVideo : videoInput,
		remoteVideo : videoOutput,
		onicecandidate : onIceCandidate
	}

	webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function(
			error) {
		if (error) {
			console.error(error);
			setCallState(NO_CALL);
		}

		this.generateOffer(function(error, offerSdp) {
			if (error) {
				console.error(error);
				setCallState(NO_CALL);
			}
			var message = {
				id : 'call',
				from : document.getElementById('name').value,
				to : document.getElementById('peer').value,
				sdpOffer : offerSdp
			};
			sendMessage(message);
			console.log(" --> ligando.... ");
			console.log(message);
		});
	});

}

function stop(message) {
	setCallState(NO_CALL);
	if (webRtcPeer) {
		webRtcPeer.dispose();
		webRtcPeer = null;

		if (!message) {
			var message = {
				id : 'stop'
			}
			sendMessage(message);
		}
	}
	hideSpinner(videoInput, videoOutput);
}

function sendMessage(message) {
	var jsonMessage = JSON.stringify(message);
	console.log('Senging message: ' + jsonMessage);
	ws.send(jsonMessage);
}

function onIceCandidate(candidate) {
	console.log('Local candidate' + JSON.stringify(candidate));

	var message = {
		id : 'onIceCandidate',
		candidate : candidate
	}
	sendMessage(message);
}

function showSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].poster = './img/transparent-1px.png';
		arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
	}
}

function hideSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].src = '';
		arguments[i].poster = './img/webrtc.png';
		arguments[i].style.background = '';
	}
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
	event.preventDefault();
	$(this).ekkoLightbox();
});
