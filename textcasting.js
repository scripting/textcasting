const myVersion = "0.6.2", myProductName = "textcasting";  

exports.start = start; 
exports.post = sendToPlatform; //8/29/24 by DW

const fs = require ("fs");
const request = require ("request");
const websocket = require ("websocket").w3cwebsocket;
const utils = require ("daveutils");
const reallysimple = require ("reallysimple");
const wordpress = require ("wordpress"); 
const davehttp = require ("davehttp"); 
const qs = require ("querystring"); 
const requireFromString = require ("require-from-string"); //8/28/24 by DW
const { TwitterApi } = require ('twitter-api-v2');

var config = {
	userAgent: myProductName + "/" + myVersion,
	dataFolder: "data/textcasting/",
	port: process.env.PORT || 1422,
	flAllowAccessFromAnywhere: true, //davehttp sets CORS headers based on this value
	flLogToConsole: true, //davehttp logs each request to the console
	flTraceOnError: false, //davehttp does not try to catch the error
	flPostEnabled: true, //8/26/24 by DW -- do we handle POST calls in davehttp
	pluginsFolder: "plugins/" //8/28/24 by DW
	};
const fnameConfig = "config.json";

var stats = {
	ctHits: 0,
	whenLastHit: undefined
	};
const fnameStats = "stats.json";
var flStatsChanged = false;

function statsChanged () {
	flStatsChanged = true;
	}
function writeStats () {
	const f = config.dataFolder + fnameStats;
	utils.sureFilePath (f, function () {
		fs.writeFile (f, utils.jsonStringify (stats), function (err) {
			});
		});
	}


function sendToPlatform (platformname, params, callback) { //8/28/24 by DW
	const folder = config.pluginsFolder + "platforms/" + platformname + "/";
	const codefile = folder + "code.js";
	const options = { //the data we send to the package
		params,
		platformname,
		folder,
		userAgent: config.userAgent
		};
	fs.readFile (codefile, function (err, codetext) {
		if (err) {
			console.log ("sendToPlatform: err.message == " + err.message);
			callback (err);
			}
		else {
			var publisher, flerror;
			try {
				codetext = codetext.toString ();
				publisher = requireFromString (codetext);
				}
			catch (err) {
				const message = "Can't run the publisher because there was an error. err.message == " + err.message;
				flerror = true;
				callback ({message});
				}
			if (!flerror) {
				try {
					publisher.post (options, function (err, data) {
						if (err) {
							callback (err);
							}
						else {
							callback (undefined, data);
							}
						});
					}
				catch (err) {
					callback (err);
					}
				}
			}
		});
	}

function handleHttpRequest (theRequest) {
	var now = new Date ();
	const params = theRequest.params;
	function returnRedirect (url, code) { 
		var headers = {
			location: url
			};
		if (code === undefined) {
			code = 302;
			}
		theRequest.httpReturn (code, "text/plain", code + " REDIRECT", headers);
		}
		
	function returnPlainText (theString) {
		if (theString === undefined) {
			theString = "";
			}
		theRequest.httpReturn (200, "text/plain", theString);
		}
	function returnNotFound () {
		theRequest.httpReturn (404, "text/plain", "Not found.");
		}
	function returnData (jstruct) {
		if (jstruct === undefined) {
			jstruct = {};
			}
		theRequest.httpReturn (200, "application/json", utils.jsonStringify (jstruct));
		}
	function returnJsontext (jsontext) { //9/14/22 by DW
		theRequest.httpReturn (200, "application/json", jsontext.toString ());
		}
	function returnError (jstruct) {
		theRequest.httpReturn (500, "application/json", utils.jsonStringify (jstruct));
		}
	function httpReturn (err, returnedValue) {
		if (err) {
			returnError (err);
			}
		else {
			if (typeof returnedValue == "object") {
				returnData (returnedValue);
				}
			else {
				returnJsontext (returnedValue); //9/14/22 by DW
				}
			}
		}
	
	stats.ctHits++;
	stats.whenLastHit = now;
	statsChanged ();
	
	switch (theRequest.method) {
		case "POST":
			const postparams = qs.parse (theRequest.postBody);
			const servicename = utils.stringDelete (theRequest.lowerpath, 1, 1); //delete / at beginning of path
			sendToPlatform (servicename, postparams, httpReturn); //8/28/24 by DW
			break;
		case "GET":
			switch (theRequest.lowerpath) {
				case "/now": 
					returnPlainText (new Date ());
					return (true);
				default: 
					returnNotFound ();
					break;
				}
			break;
		}
	}

function everyMinute () {
	}
function everySecond () {
	if (flStatsChanged) {
		flStatsChanged = false;
		writeStats ();
		}
	}
function readConfig (fname, data, callback) {
	fs.readFile (fname, function (err, jsontext) {
		if (!err) {
			var jstruct;
			try {
				jstruct = JSON.parse (jsontext);
				for (var x in jstruct) {
					data [x] = jstruct [x];
					}
				}
			catch (err) {
				console.log ("readConfig: fname == " + fname + ", err.message == " + utils.jsonStringify (err.message));
				}
			}
		callback ();
		});
	}

function start (options) {
	if (options !== undefined) {
		for (var x in options) {
			config [x] = options [x];
			}
		}
	readConfig (fnameConfig, config, function () { //8/26/24 by DW
		console.log ("\n" + myProductName + " v" + myVersion + ": " + new Date ().toLocaleTimeString () + ", port == " + config.port + ".\n");
		utils.runEveryMinute (everyMinute);
		setInterval (everySecond, 1000);
		davehttp.start (config, handleHttpRequest);
		});
	}
