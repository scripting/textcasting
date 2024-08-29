exports.post = postToMastodon;

const fs = require ("fs");
const request = require ("request");
const utils = require ("daveutils");

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

function postToMastodon (options, callback) {
	const maxCtChars = 500;
	const params = options.params;
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
			callback (undefined, data);
			}
		});
	}

