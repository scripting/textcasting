#### 6/28/25; 6:08:12 PM by DW -- v0.6.5

Encountered a problem with opengraph implementation in the bluesky driver. 

If a site has metadata but it doesn't include an image, we call that an error and throw out the whole request. 

The code under that is very complex, and I don't have the time to dig into it, so I just called it a non-opengraph post.

The net effect of it is that in order for it to be recognized here it must have an image we can read.

#### 2/9/25; 9:55:15 AM by DW

I added support for open graph metadata. You have to cook your own support for this in Bluesky. I didn't try to reuse all the code that sends a post to Bluesky, so there is some replication. I had to do this quickly. In the process however, I made it much easier to test it. See the previous worknote. 

#### 2/8/25; 10:30:15 AM by DW -- how to test

How to test. 

Open the testing folder.

Run test.js.

You can add code in there to try sending different kinds of posts and step through them in the debugger.

Finally a rational way to test this stuff. 

#### 1/5/25; 11:49:06 AM by DW -- v0.6.3

Finally got images in bluesky to work again, I was just able to post a tweet to bluesky with an image.

https://bsky.app/profile/feedland.bsky.social/post/3lez2rfbxfp2n

To see the fix look in getRecord in the bluesky plugin code (just search for 1/5/25 in the source).

#### 1/1/25; 9:33:38 AM by DW

For Bluesky, use a cache to store the accessTokens. Reduce rate-limit errors. 

#### 12/28/24; 1:16:07 PM by DW

In the bluesky driver, change call to utils.getDomainFromUrl to add a boolean which should prevent it from removing www and other unnecessary bits when using the domain to tell the user where the link will take them. bluesky warns the user unnecessarily when we use "hello.com" in place of "www.hello.com."

#### 8/31/24; 10:54:27 AM by DW

<a href="http://scripting.com/2024/08/31/141919.html">Blog post</a> on scripting.com.

Added a few notes to the main readme for the repo.

Released version 0.6.0 on NPM, running it on my linkblog server.

#### 8/30/24; 11:19:47 AM by DW

Getting textcasting ready for a more serious release.

Got a new <a href="https://wordpress.com/me/security/two-step">application password</a> for WordPress, also changed password on Bluesky, got new credentials from Twitter, and a new access token from Mastodon.

#### 8/30/24; 10:05:33 AM by DW

Updated misc/frontiertest.opml to include improvements I made in the test script. Basically useful to people who have Frontier installed, or as example code for other scripting environments. 

#### 8/29/24; 10:44:49 AM by DW -- v0.6.0

Ready to deploy and document the plugin platform interface.

Got rid of config.flTextcastPostEnabled, i was trying to make it easier to test, but found that I already had local scripts that did a much better job of testing the server. 

#### 8/27/24; 12:49:20 PM by DW

I had a Frontier script for testing the server.

workspace.testTextcasting

That's the easiest way to test by far.

#### 8/26/24; 12:18:37 PM by DW

Added config.flTextcastPostEnabled.

We try to read config.json from the folder the app launches from.

When we try to post, and config.flTextcastPostEnabled. is false, display values of params on console.

Also set config.flPostEnabled to true, because we have to be able to receive POST requests.

#### 8/19/24; 4:36:11 PM by DW -- v0.5.0

I now have the ability to post to Twitter, if you have the patience to set up a developer account. 

#### 6/30/23; 6:32:12 PM by DW

Catch errors on getting token in Bluesky, produce an error message that makes sense, when the username and password don't validate. 

#### 6/29/23; 2:12:24 PM by DW

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

