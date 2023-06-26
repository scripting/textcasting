const myVersion = "0.4.15", myProductName = "textcasting";  

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
	flAllowAccessFromAnywhere: true, 
	flLogToConsole: true, //davehttp logs each request to the console
	flTraceOnError: false //davehttp does not try to catch the error
	};

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
function buildParamList (paramtable) { //8/4/21 by DW
	if (paramtable === undefined) {
		return ("");
		}
	else {
		var s = "";
		for (var x in paramtable) {
			if (paramtable [x] !== undefined) { //8/4/21 by DW
				if (s.length > 0) {
					s += "&";
					}
				s += x + "=" + encodeURIComponent (paramtable [x]);
				}
			}
		return (s);
		}
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
					const maxcount = maxCtChars - 2; //the 2 is for the two newlines after the description
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
				createdAt: nowstring,
				reply: item.reply //6/11/23 by DW
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
			var reply = undefined;
			if (params.reply !== undefined) {
				try {
					reply = JSON.parse (params.reply);
					}
				catch (err) {
					}
				}
			const item = {
				title: params.title,
				description: params.description,
				link: params.link,
				reply //6/11/23 by DW
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
	function editPost (client, title, content, link, idPostToUpdate, callback) { //6/26/23 by DW
		if (link !== undefined) {
			content += "\n\n" + link;
			}
		
		const thePost = {
			title, 
			content,
			status: "publish" //omit this to create a draft that isn't published
			};
		client.editPost (idPostToUpdate, thePost, function (err) {
			if (err) {
				callback (err);
				}
			else {
				callback (undefined, true);
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
	
	if (params.idPostToUpdate === undefined) { //6/26/23 by DW
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
	else {
		editPost (client, params.title, params.description, params.link, params.idPostToUpdate, function (err, thePost) {
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
	
	
	}
function postToMastodon (params, callback) {
	const maxCtChars = 500;
	const urlsite = params.urlsite, accesstoken = params.accesstoken;
	const item = {
		title: params.title,
		description: params.description,
		link: params.link
		}
	function getStatusText (item, maxCtChars) { 
		var statustext = "";
		function add (s) {
			statustext += s;
			}
		function addText (desc) {
			desc = utils.trimWhitespace (utils.stripMarkup (desc));
			if (desc.length > 0) {
				const maxcount = maxCtChars - (statustext.length + desc.length + 2); //the 2 is for the two newlines after the description
				desc = utils.maxStringLength (desc, maxcount, false, true) + "\n\n";
				add (desc);
				}
			}
		function notEmpty (s) {
			if (s === undefined) {
				return (false);
				}
			if (s.length == 0) {
				return (false);
				}
			return (true);
			}
		if (notEmpty (item.title)) {
			addText (item.title);
			}
		else {
			addText (item.description);
			}
		if (notEmpty (item.link)) {
			add (item.link);
			}
		return (statustext);
		}
	function mastocall (path, params, callback) {
		var headers = undefined;
		if (params.accesstoken !== undefined) {
			headers = {
				Authorization: "Bearer " + accesstoken
				};
			}
		const theRequest = {
			url: urlsite + path + "?" + buildParamList (params),
			method: "GET",
			followAllRedirects: true, //12/3/22 by DW
			maxRedirects: 5,
			headers,
			};
		request (theRequest, function (err, response, jsontext) {
			function sendBackError (defaultMessage) {
				var flcalledback = false;
				if (data !== undefined) {
					try {
						jstruct = JSON.parse (data);
						if (jstruct.error !== undefined) {
							callback ({message: jstruct.error});
							flcalledback = true;
							}
						}
					catch (err) {
						}
					}
					
				if (!flcalledback) {
					callback ({message: defaultMessage});
					}
				}
			if (err) {
				sendBackError (err.message);
				}
			else {
				var code = response.statusCode;
				if ((code < 200) || (code > 299)) {
					const message = "The request returned a status code of " + response.statusCode + ".";
					sendBackError (message);
					}
				else {
					try {
						callback (undefined, JSON.parse (jsontext))
						}
					catch (err) {
						callback (err);
						}
					}
				}
			});
		}
	function mastopost (path, params, callback) {
		const theRequest = {
			url: urlsite + path,
			method: "POST",
			followAllRedirects: true, //12/3/22 by DW
			maxRedirects: 5,
			headers: {
				"Authorization": "Bearer " + accesstoken,
				"Content-Type": "application/x-www-form-urlencoded"
				},
			body: buildParamList (params)
			};
		request (theRequest, function (err, response, jsontext) {
			if (err) {
				console.log ("mastopost: err.message == " + err.message);
				callback (err);
				}
			else {
				var code = response.statusCode;
				if ((code < 200) || (code > 299)) {
					const message = "The request returned a status code of " + response.statusCode + ".";
					callback ({message});
					}
				else {
					try {
						callback (undefined, JSON.parse (jsontext))
						}
					catch (err) {
						callback (err);
						}
					}
				}
			});
		}
	function getUserInfo (callback) {
		mastocall ("api/v1/accounts/verify_credentials", undefined, callback);
		}
	function tootStatus (statusText, inReplyTo, callback) {
		const params = {
			status: statusText,
			in_reply_to_id: inReplyTo
			};
		mastopost ("api/v1/statuses", params, callback);
		}
	const statustext = getStatusText (item, maxCtChars); //5/12/23 by DW
	tootStatus (statustext, undefined, function (err, data) {
		if (err) {
			console.log ("postToMastodon: err.message == " + err.message);
			callback (err);
			}
		else {
			console.log ("postToMastodon: " + new Date ().toLocaleTimeString () + ": " + data.url);
			callback (undefined, data);
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
				case "/mastodon":
					postToMastodon (postparams, httpReturn);
					return (true);
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
	if (options !== undefined) {
		for (var x in options) {
			config [x] = options [x];
			}
		}
	console.log ("\n" + myProductName + " v" + myVersion + ": " + new Date ().toLocaleTimeString () + ", port == " + config.port + ".\n");
	utils.runEveryMinute (everyMinute);
	setInterval (everySecond, 1000);
	davehttp.start (config, handleHttpRequest);
	}
