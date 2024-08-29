exports.post = postToBluesky;

const fs = require ("fs");
const request = require ("request");
const utils = require ("daveutils");

function getStringBytes (theString) { //5/17/23 by DW
	const ctbytes = Buffer.byteLength (theString);
	return (ctbytes);
	}

function postToBluesky (options, callback) {
	const params = options.params;
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
				"User-Agent": options.userAgent,
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
					jstruct = JSON.parse (body);
					if (jstruct.error !== undefined) { //6/30/23 by DW
						callback (jstruct); //it has a message property
						return;
						}
					}
				catch (err) {
					callback (err);
					return;
					}
				callback (undefined, jstruct);
				}
			});
		}
	function uploadImage (options, authorization, callback) {
		const url = options.urlsite + "xrpc/com.atproto.repo.uploadBlob";
		var theRequest = {
			method: "POST",
			url: url,
			body: options.image,
			headers: {
				"User-Agent": options.userAgent,
				"Content-Type": options.imagetype,
				"Authorization": "Bearer " + authorization.accessJwt
				}
			};
		request (theRequest, function (err, response, body) { 
			if (err) {
				callback (err);
				}
			else {
				try {
					const jstruct = JSON.parse (body);
					callback (undefined, jstruct);
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
			const flAddNewlines = false;
			var statustext = "";
			function add (s) {
				statustext += s;
				}
			function addText (desc) {
				desc = decodeForBluesky (desc); 
				desc = utils.trimWhitespace (utils.stripMarkup (desc));
				if (desc.length > 0) {
					if (flAddNewlines) { //6/29/23 by DW
						desc = utils.maxStringLength (desc, maxCtChars - 2, false, true) + "\n\n";
						}
					else {
						desc = utils.maxStringLength (desc, maxCtChars, false, true);
						}
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
			
			if (item.imagecid !== undefined) {
				theRecord.embed = {
					"$type": "app.bsky.embed.images",
					images: [
						{
							image: {
								cid: item.imagecid,
								mimeType: item.imagetype
								},
							alt: ""
							}
						]
					};
				}
			if (notEmpty (item.link)) {
				const linkword = utils.getDomainFromUrl (item.link);
				theRecord.text += " " + linkword; //8/28/24 by DW -- added space
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
				"User-Agent": options.userAgent,
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
			callback (err);
			}
		else {
			function doNewPost (imagecid, imagetype) {
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
					reply, //6/11/23 by DW
					imagecid, imagetype //6/29/23 by DW
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
			if (params.image !== undefined) { //6/29/23 by DW
				if (params.imagetype === undefined) {
					params.imagetype = "image/png";
					}
				uploadImage (params, authorization, function (err, data) {
					if (err) {
						callback (err);
						}
					else {
						const theCid = data.blob.ref ["$link"];
						doNewPost (theCid, params.imagetype);
						}
					});
				}
			else {
				doNewPost ();
				}
			}
		});
	}
