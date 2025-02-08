const utils = require ("daveutils"); 
const textcasting = require ("textcasting");  

var config = new Object ();

utils.readConfig ("config.json", config, function () {
	var params = config.params;
	params.description = utils.getRandomSnarkySlogan ();
	params.link = "http://scripting.com/2025/01/31/141237.html";
	console.log (utils.jsonStringify (params));
	
	textcasting.start ();
	textcasting.post ("bluesky", params, function (err, data) {
		if (err) {
			console.log (err.message);
			}
		else {
			console.log (utils.jsonStringify (data));
			}
		});
	});




