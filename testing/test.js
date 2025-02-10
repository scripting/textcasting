const utils = require ("daveutils"); 
const textcasting = require ("textcasting");  

var config = new Object ();

utils.readConfig ("config.json", config, function () {
	var params = config.params;
	params.description = "I'm describing something here that I think might be of interest.";
	params.link = "https://sfstandard.com/2025/02/08/aaron-swartz-marble-statue-unveiled-internet-archive/";
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




