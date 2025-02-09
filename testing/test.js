const utils = require ("daveutils"); 
const textcasting = require ("textcasting");  

var config = new Object ();

utils.readConfig ("config.json", config, function () {
	var params = config.params;
	
	params.title = "Recommend listening to the segment of this week&#39;s On The Media about what&#39;s going on at the DoJ. I know you don&#39;t need more to be depressed about,";
	
	
	
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




