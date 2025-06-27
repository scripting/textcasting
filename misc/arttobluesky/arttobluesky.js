const myVersion = "0.5.2", myProductName = "artToBluesky"; 

const fs = require ("fs");
const utils = require ("daveutils");
const request = require ("request");
const textcasting = require ("textcasting");
const rss = require ("daverss");
const s3 = require ("daves3");

var config = {
	enabled: true,
	artFolder: "/Users/davewiner/github/artDownloader/",
	jsonFolder: "data/json/",
	ctMinutesBetwPosts: 60,
	extraTags: "",
	pathDestRssFile: "/scripting.com/artToBluesky/rss.xml",
	pathDestJsonFile: "/scripting.com/artToBluesky/rss.json",
	rssFeedUrl: "https://art.feediverse.org/",
	rssTitle: "Great art on Bluesky",
	rssLink: "https://bsky.app/profile/art.feediverse.org",
	rssItemAuthor: "dave.winer@gmail.com (Dave Winer)",
	rssDescription: "A beautiful work of art every hour.", 
	rssLanguage: "en-us",
	rssGenerator: myProductName + " v" + myVersion,
	rssDocs: "http://cyber.law.harvard.edu/rss/rss.html",
	rssMaxItems: 25,
	appDomain: "scripting.com",
	flRssCloudEnabled:  true,
	rssCloudDomain:  "rpc.rsscloud.io",
	rssCloudPort:  5337,
	rssCloudPath: "/pleaseNotify",
	rssCloudRegisterProcedure:  "",
	rssCloudProtocol:  "http-post",
	fnameRssHistory: "rssHistory.json",
	
	rssDailyTitle: "Great art on Bluesky (daily)", //6/10/25 by DW
	rssDailyDescription: "A beautiful work of art every day.",
	pathDailyFeed: "/scripting.com/artToBluesky/daily.xml",
	rssDailyFeedUrl: "https://artdaily.feediverse.org/",
	};

var globals = {
	theArt: new Array (),
	whenLastPost: new Date (0),
	rssHistory: new Array (), //5/15/25 by DW
	whenLastDaily: new Date () //6/10/25 by DW
	}

function getBlueskyUrl (uri) { //5/15/25 by DW
	const match = uri.match (/^at:\/\/([^\/]+)\/app\.bsky\.feed\.post\/(.+)$/);
	if (match) {
		const did = match [1];
		const rkey = match [2];
		return (`https://bsky.app/profile/${did}/post/${rkey}`);
		}
	else {
		return (undefined);
		}
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
function buildDailyFeed () { //6/10/25 by DW
	if (globals.rssHistory.length > 0) {
		const headElements = {
			title: config.rssDailyTitle,
			link: config.rssLink,
			description: config.rssDailyDescription,
			language: config.rssLanguage,
			generator: config.rssGenerator,
			docs: config.rssDocs,
			urlSelf: config.rssDailyFeedUrl,
			maxFeedItems: config.rssMaxItems,
			appDomain: config.appDomain,
			flRssCloudEnabled:  config.flRssCloudEnabled,
			rssCloudDomain:  config.rssCloudDomain,
			rssCloudPort:  config.rssCloudPort,
			rssCloudPath: config.rssCloudPath,
			rssCloudRegisterProcedure:  config.rssCloudRegisterProcedure,
			rssCloudProtocol:  config.rssCloudProtocol,
			image: {
				url: "https://imgs.scripting.com/2025/06/07/girlWithPearlEarring.png",
				title: config.rssTitle,
				link: config.rssLink,
				description: config.rssDailyDescription
				},
			}
		const myHistory = [
			globals.rssHistory [0]
			];
		const xmltext = rss.buildRssFeed (headElements, myHistory);
		s3.newObject (config.pathDailyFeed, xmltext, "text/xml", "public-read", function (err, data) {
			if (err) {
				console.log ("buildDailyFeed: err.message == " + err.message);
				}
			else {
				console.log ("buildDailyFeed: config.pathDailyFeed == " + config.pathDailyFeed);
				rss.cloudPing (undefined, config.rssDailyFeedUrl);
				}
			});
		}
	}
function buildRssFeed () { //5/15/25 by DW
	const whenstart = new Date ();
	const fnameRss = "rss.xml", fnameJson = "rss.json";
	var headElements = {
		title: config.rssTitle,
		link: config.rssLink,
		description: config.rssDescription,
		language: config.rssLanguage,
		generator: config.rssGenerator,
		docs: config.rssDocs,
		maxFeedItems: config.rssMaxItems,
		appDomain: config.appDomain,
		flRssCloudEnabled:  config.flRssCloudEnabled,
		rssCloudDomain:  config.rssCloudDomain,
		rssCloudPort:  config.rssCloudPort,
		rssCloudPath: config.rssCloudPath,
		rssCloudRegisterProcedure:  config.rssCloudRegisterProcedure,
		rssCloudProtocol:  config.rssCloudProtocol,
		image: {
			url: "https://imgs.scripting.com/2025/06/07/girlWithPearlEarring.png",
			title: config.rssTitle,
			link: config.rssLink,
			description: config.rssDescription
			},
		urlSelf: config.rssFeedUrl, //6/10/25 by DW
		}
	function writeJsonVersion (headElements, rssHistory) {
		var jstruct = {
			headElements: headElements, 
			items: rssHistory
			}
		var jsontext = utils.jsonStringify (jstruct);
		fs.writeFile (fnameJson, jsontext, function () {
			});
		s3.newObject (config.pathDestJsonFile, jsontext, "application/json", "public-read", function (err, data) {
			if (err) {
				console.log ("writeJsonVersion: err.message == " + err.message);
				}
			else {
				console.log ("writeJsonVersion: config.pathDestJsonFile == " + config.pathDestJsonFile);
				}
			});
		}
	var xmltext = rss.buildRssFeed (headElements, globals.rssHistory);
	fs.writeFile (fnameRss, xmltext, function () {
		});
	s3.newObject (config.pathDestRssFile, xmltext, "text/xml", "public-read", function (err, data) {
		if (err) {
			console.log ("buildRss: err.message == " + err.message);
			}
		else {
			console.log ("buildRss: config.pathDestRssFile == " + config.pathDestRssFile);
			rss.cloudPing (undefined, config.rssFeedUrl);
			}
		});
	writeJsonVersion (headElements, globals.rssHistory);
	}
function readRssHistory (callback) {
	fs.readFile (config.fnameRssHistory, function (err, jsontext) {
		if (err) {
			callback (err);
			}
		else {
			try {
				globals.rssHistory = JSON.parse (jsontext);
				}
			catch (err) {
				callback (err);
				return;
				}
			callback (undefined, globals.rssHistory);
			}
		});
	}
function saveRssHistory () {
	const jsontext = utils.jsonStringify (globals.rssHistory);
	fs.writeFile (config.fnameRssHistory, jsontext, function (err) {
		});
	}
function postRandomArt (thePrefs=config) {
	globals.whenLastPost = new Date ();
	const ix = utils.random (0, globals.theArt.length - 1);
	const jstruct = globals.theArt [ix];
	
	var githubUrl;
	
	function readImageFromGithub (fname, callback) { //7/9/23 by DW
		var url = "https://raw.githubusercontent.com/scripting/artDownloader/main/data/images/" + fname;
		request ({url, encoding: null}, function (err, response, data) {
			if (err) {
				callback (err);
				}
			else {
				if (response.statusCode == 200) {
					githubUrl = url;
					callback (undefined, data);
					}
				else {
					message = "HTTP error code == " + response.statusCode;
					callback ({message});
					}
				}
			});
		}
	
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
					
					const blueskyUrl = getBlueskyUrl (data.uri); //5/15/25 by DW
					const rssItem = {
						title: "",
						text: title,
						when: new Date (),
						link: blueskyUrl,
						guid: {
							flPermalink: true,
							value: blueskyUrl
							},
						enclosure: {
							url: githubUrl,
							type: "image/jpeg",
							length: theImageData.length,
							}
						};
					globals.rssHistory.unshift (rssItem);
					while (globals.rssHistory.length > config.rssMaxItems) {
						globals.rssHistory.pop ();
						}
					saveRssHistory ();
					buildRssFeed ();
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
		if (!utils.sameDay (now, globals.lastDate)) { //6/10/25 by DW
			globals.lastDate = now;
			buildDailyFeed ();
			}
		}
	}
function startup () {
	readConfig ("config.json", config, function () {
		console.log ("config == " + utils.jsonStringify (config));
		readRssHistory (function (err) { //5/15/25 by DW
			fs.readFile ("art.json", function (err, jsontext) { //a big file with info about all the art we have on github
				globals.theArt = JSON.parse (jsontext);
				console.log ("globals.theArt.length == " + globals.theArt.length);
				buildDailyFeed (); //testing -- 6/10/25 by DW
				utils.runEveryMinute (everyMinute);
				})
			});
		
		});
	}

startup ();


