exports.post = postToTwitter;

const fs = require ("fs");
const request = require ("request");
const utils = require ("daveutils");
const { TwitterApi } = require ('twitter-api-v2');

function postToTwitter (options, callback) { //8/19/24 by DW
	const params = options.params;
	var tweetText = params.description;
	
	if (params.link !== undefined) {
		if (params.link.length > 0) {
			tweetText += "\n\n" + params.link;
			}
		}
	
	async function internalCall () {
		const client = new TwitterApi ({
			appKey: params.apikey,
			appSecret: params.apikeysecret,
			accessToken: params.accesstoken,
			accessSecret: params.accesstokensecret
			});
		try {
			const tweet = await client.v2.tweet (tweetText);
			callback (undefined, tweet);
			} 
		catch (err) {
			callback (err);
			}
		}
	internalCall ();
	}
