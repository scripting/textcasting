const fs = require ("fs");
const utils = require ("daveutils");
const request = require ("request");
const textcasting = require ("textcasting");

var config = {
	enabled: true,
	artFolder: "/Users/davewiner/github/artDownloader/",
	jsonFolder: "data/json/",
	ctMinutesBetwPosts: 60,
	extraTags: ""
	};

var globals = {
	theArt: new Array (),
	whenLastPost: new Date (0)
	}

function readConfig (f, config, callback) {
	fs.readFile (f, function (err, jsontext) {
		if (!err) {
			try {
				var jstruct = JSON.parse (jsontext);
				for (var x in jstruct) {
					config [x] = jstruct [x];
					}
				}
			catch (err) {
				console.log ("Error reading " + f);
				}
			}
		callback ();
		});
	}

function readImageFromGithub (fname, callback) { //7/9/23 by DW
	var url = "https://raw.githubusercontent.com/scripting/artDownloader/main/data/images/" + fname;
	request ({url, encoding: null}, function (err, response, data) {
		if (err) {
			callback (err);
			}
		else {
			if (response.statusCode == 200) {
				callback (undefined, data);
				}
			else {
				message = "HTTP error code == " + response.statusCode;
				callback ({message});
				}
			}
		});
	}

function postRandomArt (thePrefs=config) {
	globals.whenLastPost = new Date ();
	const ix = utils.random (0, globals.theArt.length - 1);
	const jstruct = globals.theArt [ix];
	
	readImageFromGithub (jstruct.fname, function (err, theImageData) {
		if (err) {
			console.log ("postRandomArt: err.message == " + err.message);
			}
		else {
			const pattern = /https?:\/\/\S+/g;
			var title = jstruct.text.replace (pattern, ""); //delete the url at the end of the text
			title = title.replace (/ +/g, " "); //collapse multiple spaces to one space
			title = utils.trimWhitespace (title);
			title += " " + config.extraTags; //6/30/23 by DW
			const params = {
				urlsite: thePrefs.siteurl,
				mailaddress: thePrefs.mailaddress,
				password: thePrefs.password,
				title,
				image: theImageData,
				imagetype: "image/jpeg"
				}
			textcasting.post ("bluesky", params, function (err, data) {
				if (err) {
					console.log ("postRandomArt: err.message == " + err.message);
					}
				else {
					console.log (new Date ().toLocaleTimeString () + ": " + params.title);
					}
				});
			fs.writeFile ("img.jpg", theImageData, function (err) { //debugging
				});
			}
		});
	
	}
function everyMinute () {
	if (config.enabled) { //9/20/23 by DW
		const now = new Date ();
		if ((now.getMinutes () % config.ctMinutesBetwPosts) == 0) {
			console.log ("everyMinute: posting art, now == " + now.toLocaleTimeString ());
			postRandomArt ();
			}
		}
	}

readConfig ("config.json", config, function () {
	console.log ("config == " + utils.jsonStringify (config));
	
	fs.readFile ("art.json", function (err, jsontext) {
		globals.theArt = JSON.parse (jsontext);
		console.log ("globals.theArt.length == " + globals.theArt.length);
		postRandomArt (); //post one immediately on startup 
		utils.runEveryMinute (everyMinute);
		})
	
	
	});

