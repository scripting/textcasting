exports.post = postToBluesky;

const fs = require ("fs");
const request = require ("request");
const ogs = require ("open-graph-scraper"); //2/8/25 by DW
const utils = require ("daveutils");

var config = {
	maxSecsCacheItem: 60 * 59 //expire after 59 minutes
	};

function httpReadUrl (url, callback) { //2/8/25 by DW
	request (url, function (err, response, data) {
		if (err) {
			callback (err);
			}
		else {
			if (response.statusCode != 200) {
				const errstruct = {
					message: "Can't read the URL, \"" + url + "\" because we received a status code of " + response.statusCode + ".",
					statusCode: response.statusCode
					};
				callback (errstruct);
				}
			else {
				callback (undefined, data);
				}
			}
		});
	}
function getOpenGraphData (url, callback) { //2/8/25 by DW
	httpReadUrl (url, function (err, htmltext) {
		if (err) {
			callback (err);
			}
		else {
			const options = {
				html: htmltext
				};
			ogs (options, function (err, results, response) {
				if (err) {
					callback (err);
					}
				else {
					var urlImage = undefined;
					if (results.data.ogImage !== undefined) {
						if (results.data.ogImage.url !== undefined) {
							urlImage = results.data.ogImage.url
							}
						}
					const metadata = {
						title: results.data.ogTitle,
						description: results.data.ogDescription,
						url: results.data.ogUrl,
						urlImage,
						type: results.data.ogType,
						sitename: results.data.ogSiteName
						};
					callback (undefined, metadata);
					}
				});
			}
		});
	}
function getStringBytes (theString) { //5/17/23 by DW
	const ctbytes = Buffer.byteLength (theString);
	return (ctbytes);
	}
function getTypeFromUrl (originalUrl) { //2/9/25 by DW
	const url = utils.stringNthField (originalUrl, "?", 1); //remove search args
	const ext = utils.stringLastField (url, ".");
	const type = utils.httpExt2MIME (ext);
	return (type);
	}
function decodeForBluesky (s) { //2/9/25 by DW
	s = utils.decodeXml (s); //5/20/23 by DW
	var replacetable = { 
		"#39": "'"
		};
	s = utils.multipleReplaceAll (s, replacetable, true, "&", ";");
	return (s);
	}
function notEmpty (s) { //2/10/25 by DW
	if (s === undefined) {
		return (false);
		}
	if (s.length == 0) {
		return (false);
		}
	return (true);
	}

//accessToken cache -- 1/1/25 by DW
	const fnameCache = "data/bluesky/accessTokenCache.json";
	function removeExpiredCacheItems (theCache) {
		var theNewCache = new Object ();
		for (var x in theCache) {
			const item = theCache [x];
			if (utils.secondsSince (item.when) <= config.maxSecsCacheItem) {
				theNewCache [x] = item;
				}
			}
		return (theNewCache);
		}
	function readCacheFile (callback) {
		fs.readFile (fnameCache, function (err, jsontext) {
			const emptyCache = new Object ();
			if (err) {
				console.log ("readCacheFile: err.message == " + err.message);
				callback (err, emptyCache);
				}
			else {
				var theCache;
				try {
					theCache = JSON.parse (jsontext);
					}
				catch (err) {
					console.log ("readCacheFile: err.message == " + err.message);
					callback (err, emptyCache);
					return;
					}
				theCache = removeExpiredCacheItems (theCache);
				callback (undefined, theCache);
				}
			});
		}
	function writeCacheFile (theCache) {
		utils.sureFilePath (fnameCache, function () {
			const jsontext = utils.jsonStringify (theCache);
			fs.writeFile (fnameCache, jsontext, function (err) {
				if (err) {
					console.log ("writeCacheFile:  err.message == " + err.message);
					}
				});
			});
		}
	
	
	
	

function postToBluesky (options, callback) {
	
	const userAgent = options.userAgent; //2/8/25 by DW
	const folder = options.folder; 
	const platformname = options.platformname; 
	
	const params = options.params;
	const maxCtChars = 300;
	
	function getAccessToken (options, callback) {
		readCacheFile (function (err, theCache) { //1/1/25 by DW
			if (theCache [options.mailaddress] !== undefined) { //1/1/25 by DW
				callback (undefined, theCache [options.mailaddress].jstruct);
				}
			else {
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
						
						theCache [options.mailaddress] = {
							when: new Date (),
							jstruct
							};
						writeCacheFile (theCache);
						
						callback (undefined, jstruct);
						}
					});
				}
			});
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
		
		function getRecord (item) {
			var theRecord = {
				text: getStatusText (item),
				createdAt: nowstring,
				reply: item.reply //6/11/23 by DW
				}
			
			if (item.imagecid !== undefined) { //1/5/25 by DW
				var altText = (item.description === undefined) ? "" : item.description;
				theRecord.embed = { //1/5/25 by DW
					"$type": "app.bsky.embed.images",
					images: [
						{
							alt: altText,
							image: {
								"$type": "blob",
								"ref": {
									"$link": item.imagecid
									},
								"mimeType": item.imagetype,
								"size": item.imagesize || 0 // Provide the image size if available
								}
							}
						]
					};
				}
			if (notEmpty (item.link)) {
				const linkword = utils.getDomainFromUrl (item.link, false); //12/28/24 by DW
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
			
			function isOpenGraphPost (params, metadata) {
				console.log ("isOpenGraphPost");
				const theRequest = {
					url: metadata.urlImage,
					encoding: null
					}
				httpReadUrl (theRequest, function (err, data) { //get the image from the open graph data
					if (err) {
						callback (err);
						}
					else {
						console.log ("metadata.urlImage == " + metadata.urlImage);
						const imagetype = utils.httpExt2MIME (utils.stringLastField (metadata.urlImage, ".")); 
						const options = {
							urlsite: params.urlsite,
							image: data,
							userAgent,
							imagetype: getTypeFromUrl (metadata.urlImage) //2/9/25 by DW
							};
						uploadImage (options, authorization, function (err, theBlob) {
							if (err) {
								callback (err);
								}
							else {
								const apiUrl = params.urlsite + "xrpc/com.atproto.repo.createRecord";
								
								const bodystruct = {
									repo: authorization.did,
									collection: "app.bsky.feed.post",
									validate: true,
									record: {
										text: getStatusText (params), //2/10/25 by DW
										$type: "app.bsky.feed.post",
										embed: {
											$type: "app.bsky.embed.external",
											external: {
												uri: metadata.url,
												thumb: theBlob.blob,
												title: metadata.title,
												description: metadata.description
												}
											},
										createdAt: new Date ().toISOString ()
										}
									};
								var theRequest = {
									method: "POST",
									url: apiUrl,
									body: utils.jsonStringify (bodystruct),
									headers: {
										"User-Agent": userAgent,
										"Content-Type": "application/json",
										Authorization: "Bearer " + authorization.accessJwt
										}
									};
								console.log ("isOpenGraphPost: bodystruct == " + utils.jsonStringify (bodystruct));
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
							});
						}
					});
				}
			function notOpenGraphPost (params) {
				console.log ("notOpenGraphPost");
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
			if (params.link !== undefined) { //2/8/25 by DW
				getOpenGraphData (params.link, function (err, metadata) {
					if (err) { //no opengraph metadata
						notOpenGraphPost (params);
						}
					else {
						if (metadata.urlImage === undefined) { //6/28/25 by DW
							notOpenGraphPost (params);
							}
						else {
							isOpenGraphPost (params, metadata);
							}
						}
					});
				}
			else {
				notOpenGraphPost (params);
				}
			}
		});
	}
