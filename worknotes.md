#### 6/11/23; 4:06:00 PM by DW

For Bluesky, allow the caller to specify the elements of a reply, root and parent.

See this <a href="https://github.com/scripting/blue.feedland/issues/14#issuecomment-1586214930">thread</a> for an explanation of how this works thanks to John Spurlock.

#### 5/27/23; 8:40:46 AM by DW

A fork of feedToMasto, which started as a way to map a set of RSS feeds onto a Mastodon account, then added Bluesky and WordPress. 

It was hooked into a FeedLand instance via websockets, so it received instant notification that the feed had updated.

The textcasting package is the core of the feedToMasto functionality, it just handles the sending of messsages to Masto, Bluesky and WordPress. 

I left feedToMasto where it was. If it serves a purpose in the future it should use this package.

