const myVersion = "0.4.1", myProductName = "textcasting"; 

const fs = require ("fs");
const request = require ("request");
const websocket = require ("websocket").w3cwebsocket;
const utils = require ("daveutils");
const reallysimple = require ("reallysimple");
const wordpress = require ("wordpress"); 

var config = {
	enabled: true,
	}
const fnameConfig = "config.json";

var stats = {
	};
const fnameStats = "stats.json";
var flStatsChanged = false;

function statsChanged () {
	flStatsChanged = true;
	}
function writeStats () {
	fs.writeFile (fnameStats, utils.jsonStringify (stats), function (err) {
		});
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

function startup () {
	console.log ("startup");
	readConfig (fnameStats, stats, function () {
		readConfig (fnameConfig, config, function () {
			console.log ("config == " + utils.jsonStringify (config));
			utils.runEveryMinute (everyMinute);
			setInterval (everySecond, 1000);
			});
		});
	}
startup ();
