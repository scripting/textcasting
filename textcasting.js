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
	userAgent: myProductName + "/" + myVersion,
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
function getStringBytes (theString) { //5/17/23 by DW
	const ctbytes = Buffer.byteLength (theString);
	return (ctbytes);
	}

function postToBluesky (params, callback) {
	const maxCtChars = 300;
	function getAccessToken (options, callback) {
		const url = options.urlsite + "xrpc/com.atproto.server.createSession";
		const bodystruct = {
			identifier: options.mailaddress,
			password: options.password
			};
		var theRequest = {
			method: "POST",
			url: url,
			body: utils.jsonStringify (bodystruct),
			headers: {
				"User-Agent": config.userAgent,
				"Content-Type": "application/json"
				}
			};
		request (theRequest, function (err, response, body) { 
			var jstruct = undefined;
			if (err) {
				callback (err);
				}
			else {
				try {
					callback (undefined, JSON.parse (body));
					}
				catch (err) {
					callback (err);
					}
				}
			});
		}
	function newPost (options, authorization, item, callback) {
		const url = options.urlsite + "xrpc/com.atproto.repo.createRecord";
		const nowstring = new Date ().toISOString ();
		
		function notEmpty (s) {
			if (s === undefined) {
				return (false);
				}
			if (s.length == 0) {
				return (false);
				}
			return (true);
			}
		function decodeForBluesky (s) {
			s = utils.decodeXml (s); //5/20/23 by DW
			var replacetable = { 
				"#39": "'"
				};
			s = utils.multipleReplaceAll (s, replacetable, true, "&", ";");
			return (s);
			}
		function getStatusText (item) { //special for bluesky, just get the text, no link
			var statustext = "";
			function add (s) {
				statustext += s;
				}
			function addText (desc) {
				desc = decodeForBluesky (desc); 
				desc = utils.trimWhitespace (utils.stripMarkup (desc));
				if (desc.length > 0) {
					const maxcount = maxCtChars - (statustext.length + desc.length + 2); //the 2 is for the two newlines after the description
					desc = utils.maxStringLength (desc, maxcount, false, true) + "\n\n";
					add (desc);
					}
				}
			if (notEmpty (item.title)) {
				addText (item.title);
				}
			else {
				addText (item.description);
				}
			return (statustext);
			}
		function getRecord (item) {
			var theRecord = {
				text: getStatusText (item),
				createdAt: nowstring
				}
			if (notEmpty (item.link)) {
				const linkword = utils.getDomainFromUrl (item.link);
				theRecord.text += linkword;
				const ctbytes = getStringBytes (theRecord.text); //5/16/23 by DW
				theRecord.facets = [
					{
						features: [
							{
								uri: item.link,
								"$type": "app.bsky.richtext.facet#link"
								}
							],
						index: {
							byteStart: ctbytes - linkword.length, //5/16/23 by DW
							byteEnd: ctbytes
							}
						}
					];
				}
			console.log ("bluesky/getRecord: theRecord == " + utils.jsonStringify (theRecord));
			return (theRecord);
			}
		
		const bodystruct = {
			repo: authorization.did,
			collection: "app.bsky.feed.post",
			validate: true,
			record: getRecord (item)
			};
		var theRequest = {
			method: "POST",
			url: url,
			body: utils.jsonStringify (bodystruct),
			headers: {
				"User-Agent": config.userAgent,
				"Content-Type": "application/json",
				Authorization: "Bearer " + authorization.accessJwt
				}
			};
		request (theRequest, function (err, response, body) { 
			if (err) {
				callback (err);
				}
			else {
				try {
					callback (undefined, JSON.parse (body));
					}
				catch (err) {
					callback (err);
					}
				}
			});
		}
	getAccessToken (params, function (err, authorization) {
		if (err) {
			console.log ("postToBluesky: err.message == " + err.message);
			callback (err);
			}
		else {
			const item = {
				title: params.title,
				description: params.description,
				link: params.link
				}
			newPost (params, authorization, item, function (err, data) {
				if (err) {
					console.log ("postToBluesky: err.message == " + err.message);
					callback (err);
					}
				else {
					callback (undefined, data);
					}
				});
			}
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
				case "/bluesky":
					postToBluesky (postparams, httpReturn);
					return (true);
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