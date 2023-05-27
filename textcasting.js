const myVersion = "0.4.7", myProductName = "textcasting"; 

exports.start = start; 

const fs = require ("fs");
const request = require ("request");
const websocket = require ("websocket").w3cwebsocket;
const utils = require ("daveutils");
const reallysimple = require ("reallysimple");
const wordpress = require ("wordpress"); 
const davehttp = require ("davehttp"); 
const qs = require ("querystring"); 

var config = {
	dataFolder: "data/textcasting/",
	port: process.env.PORT || 1422,
	flPostEnabled: true,
	flLogToConsole: true, //davehttp logs each request to the console
	flTraceOnError: false //davehttp does not try to catch the error
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

function postToWordpress (params, callback) {
	const client = wordpress.createClient ({
		url: params.urlsite,
		username: params.username,
		password: params.password
		});
	
	function getPostInfo (client, idPost, callback) {
		client.getPost (idPost, function (err, thePost) {
			if (err) {
				callback (err);
				}
			else {
				callback (undefined, thePost);
				}
			});
		}
	function newPost (client, title, content, link, callback) {
		if (link !== undefined) {
			content += "\n\n" + link;
			}
		
		const thePost = {
			title, 
			content,
			status: "publish" //omit this to create a draft that isn't published
			};
		client.newPost (thePost, function (err, idNewPost) {
			if (err) {
				callback (err);
				}
			else {
				getPostInfo (client, idNewPost, function (err, theNewPost) {
					if (err) {
						callback (err);
						}
					else {
						callback (undefined, theNewPost);
						}
					});
				}
			});
		}
	
	newPost (client, params.title, params.description, params.link, function (err, thePost) {
		if (err) {
			console.log ("postToWordpress: err.message == " + err.message);
			callback (err);
			}
		else {
			console.log ("postToWordpress: thePost.link == " + thePost.link);
			callback (undefined, thePost);
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
			switch (theRequest.lowerpath) {
				case "/wordpress":
					postToWordpress (postparams, httpReturn);
					return (true);
				default: 
					returnNotFound ()
					return (true);
				}
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
	for (var x in options) {
		config [x] = options [x];
		}
	console.log ("\n" + myProductName + " v" + myVersion + ": " + new Date ().toLocaleTimeString () + ", port == " + config.port + ".\n");
	utils.runEveryMinute (everyMinute);
	setInterval (everySecond, 1000);
	davehttp.start (config, handleHttpRequest);
	}
