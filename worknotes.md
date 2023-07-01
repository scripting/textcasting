6/30/23; 6:32:12 PM by DW

Catch errors on getting token in Bluesky, produce an error message that makes sense, when the username and password don't validate.

6/29/23; 2:12:24 PM by DW

You can now add an image to a post to Bluesky. 

Two new params to pass:

* "image" whose value is the bits of the image.

* "imagetype" provides the mime type for the image

It works! :-)

* http://scripting.com/2023/06/29.html#a141303

And having it in this package means its super easy to do from outside. 

Example app is artToBluesky.

#### 6/29/23; 12:04:48 PM by DW

Added new interface function -- post, so you can post from a Node app, without going through the HTTP server. 

#### 6/26/23; 6:43:24 PM by DW

How to test textcasting locally

* There's a <i>testing</i> sub-folder of the code folder. 

* From that directory do: <i>node --inspect-brk test.js</i>

#### 6/26/23; 6:24:59 PM by DW

Here's how you update an existing post in textcasting. 

Add <i>idPostToUpdate</i> to the post object with the value of the id of the post you want to update. 

I'm going to use this in hooking Drummer up to WordPress. 

#### 6/11/23; 4:06:00 PM by DW

For Bluesky, allow the caller to specify the elements of a reply, root and parent.

See this <a href="https://github.com/scripting/blue.feedland/issues/14#issuecomment-1586214930">thread</a> for an explanation of how this works thanks to John Spurlock.

#### 5/27/23; 8:40:46 AM by DW

A fork of feedToMasto, which started as a way to map a set of RSS feeds onto a Mastodon account, then added Bluesky and WordPress. 

It was hooked into a FeedLand instance via websockets, so it received instant notification that the feed had updated.

The textcasting package is the core of the feedToMasto functionality, it just handles the sending of messsages to Masto, Bluesky and WordPress. 

I left feedToMasto where it was. If it serves a purpose in the future it should use this package.

