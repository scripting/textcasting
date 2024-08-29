exports.post = postToWordpress;

const fs = require ("fs");
const request = require ("request");
const utils = require ("daveutils");
const wordpress = require ("wordpress"); 

function postToWordpress (options, callback) {
	const params = options.params;
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
