# textcasting

An HTTP server that can post messages to Mastodon, Bluesky, Twitter and WordPress via REST call. 

Think of it as a bridge between web writing tools and various places people want to post their writing to.

It has a plug-in architecture, so you don't have to mess with the code to add support for other social web systems.

### Goal

To make linkblogging across all the twitter-like systems as easy as it can be, based on the features and limits of each platform.

It's a good time to do this because there are enough twitter-like systems out there, and people are manually doing what textcasting eventually will do automatically.

### Platform drivers

As of August 2024, there's now a plug-in architecture. 

Instead of implementing support for each of the platforms in the textcasting.js main file, they are in a folder where you can add new platform support. There are four examples in this repo.

You don't have to restart the server to add a new platform driver. 

Here's an <a href="https://github.com/scripting/textcasting/blob/main/plugins/platforms/mastodon/code.js">example</a> of a platform driver. It's a Node.js package that exports a single function named post that takes two params, an options object and a callback function.

The options object has all the params the plugin needs. Each platform is different, some require usernames and passwords, some a combination of four access tokens. The params  are passed via a REST call from the client to the textcasting server. 

The function calls back with usual two params, err and data, data is whatever the platform sent back to us about the posting of the item. 

### The plugins/platforms folder

Platforms have names like twitter, mastodon, bluesky, wordpress etc. 

It's an open architecture -- to add a new platform, create a sub-folder of the plugins/publishers folder

The name of the sub-folder is the name of the platform.

The folder must contain a file named code.js which contains the source code of a Node module that uses the params to send a message to the platform. 

It must export a function named post. It receives the options struct, and a callback. 

It then sends the message, and reports back the result through the callback.

The module receives, in the options struct, the folder it came from, so it can save files and access them later, for storing stats, for example. 

Over time there may be other required files in a platform's folder. 

### The REST interface

If your server is running at https://mytextcast.com/, then you can send a message via Mastodon, for example, by sending a POST request to:

`https://mytextcast.com/mastodon`

The body of the post contains the parameters the Mastodon platform driver requires, which are urlsite, accesstoken, title, link and description.

The params are found in options.params. 

Other elements of options, provided automatically by textcasting: 

* platformname -- in this case "mastodon"

* folder -- the filesystem path to the folder the driver was found in, giving the driver a place to store stats and the like.

* userAgent -- the value from config.userAgent, by default the name and version number of the textcasting app, but this can be overridden in config.json.

This is <a href="https://github.com/scripting/textcasting/blob/main/textcasting.js#L146">where</a> the POST requests are handled. 

### How to set up a server

I still have to create an installation checklist.

 If I were starting a new service to do what textcasting does, I'd copy the contents of the testing folder into a local folder where you run server apps. 

Look in the config object in textcasting.js, look for things you need to override, and define them in a config.json file at the same level as the textcasting.js app. Make sure the JSON syntax is correct. 

If you've installed any platform drivers beyond the four that come in the download, you may have to add dependencies to the package.json file from the testing folder.

At the command line, enter npm install. 

And then run the app. 

### Where we're at

We need some work on making Twitter work for users, and in both cases, making it economical for developers. Ideally you should be able to just offer software and have all the services users need be provided by other services. Bluesky and WordPress work well, and as far as I can see are ready to go.

1. With Twitter you have to become a developer and not be scared off from terms like apikey, accesstoken. And there is an economic problem. Basically at this time to use this, you have to be a Twitter developer and do some simple setup. It's not technically difficult, just unnecessarily intimidating. I think a certain number of linkblogged posts should come with their $8 monthy subscription, for users -- leave developers out of this loop. Just my two cents. 

2. With Mastodon, I had to operate a gateway server, at least with my modest understanding of the Mastodon API. My driver can obviously be improved on! Mastodon of all the services should be a model for this kind of integration.

3. Bluesky and WordPress are easy to set up. They really thought this through, and they aren't restrictive about who gets to be a developer.

4. Threads, for me, has been unapproachable. I've jumped through the hoops with them before, same developer program as Facebook, and that is a graveyard of good ideas for me. And so far Manton has been doing a great job, and we can always hook these things together with RSS (as we do there) and that probably will become the standard imho. 

Anyway because Twitter and Masto are unresolved right now, I'm not ready to offer something for end-users. But this is the place where we'll get it working when it does work. This is a framework for open source. The people who do each product ideally should be responsible for the platform driver for that product. 

### These docs are rough, I know

I needed to do the transition to plaform drivers quickly because I'm in the middle of a bunch of other stuff. I wanted to get this out there mostly as a statement of intent, and also because I was tired of manual cross-platform linkblogging. 

Also see my <a href="http://scripting.com/2024/08/31/141919.html?title=plaformDrivers">latest blog post</a> on this project. 

Dave Winer

August 2024

