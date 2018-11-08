![Photo from a review by Sherri L Smith](http://hamishtodd1.github.io/personal/vrExample.png)

## What is this?

This is, or will be, ["Coot"](https://www2.mrc-lmb.cam.ac.uk/personal/pemsley/coot/) in VR. Much more will be done but so far you can *view* (but not change) the state of the molecule in VR

## Why is this being made?

We hope it will make Coot faster to use! It will be easier to see 3D features, to specify intended atom detinations, and to navigate some of the information you need to use Coot (because you have more "screen space"). It will also be easier to train people to use.

## How do I set it up

You'll need Windows, an Oculus Rift and a browser running webVR like firefox nightly or chrome canary (make sure to go to chrome://flags and enable webVR AND gamepad extensions). 

1. Run server.py with python 2.7
2. Start webVR, using the console command --allow-file-access-from-files.
3. Open index.html in your browser
4. Press "e"
5. Put on your headset.
6. Try pressing buttons on the hand controllers and moving them around. If they're frozen, close chromium and restart from 2.

## I have an issue

If this happens and you'd like to report it, it'd be great if you could copy the text of the terminal if it looks like a python thing, or if not, then from the chromium console, which you can open with something like ctrl+shift+j.

To make sure everything is ok from a hardware point of view, try this webpage - https://webvr.info/samples/XX-vr-controllers.html - you should be able to see your controllers, and if you can't then it's google for you, sorry!

One common problem is that the controllers just don't appear. If this happens try restarting the browser once or twice. Hopefully will be fixed soon!

## Any plans for this to be compatible with other headsets?

Yes! Actually it should work on the Vive already, just give me a poke on twitter (hamishtodd1) if it doesn't. I don't own any other position-tracked headsets, but if you work at Sony/Samsung/Lenovo/Acer/Dell/HP/wherever else, send me a headset and I should be able to get it working

But no to all "Cardboard" headsets including Daydream and GearVR. In the history of this repo you will find a version compatible with daydream, but it was a nightmare to get the pointer working and it is not clear what payoff there is, apart from having a super-cheap thing available to people. Read my PhD thesis (ETA 09/2019) if you want to hear UI reasons too!

## Will you have feature <x> from Coot?

Yes, I really hope to implement that! In principle I could have other things too :3

## Why don't you use Unity / Unreal?

I do use three.js, which is a graphics api. In comparison with that, Unity/Unreal:

-Longer to compile and load
-Weird UI for development
-Fairly frequent frustrating bugs and plugin issues
-Much larger download for users (threejs is 500KB)
-More complicated API
-Selfish motivation: I am more able to develop my programming skills with threejs

Reasons why many people use Unity/Unreal instead of three.js (or gtk or ogre):
-API offers many, many more features for dealing with animations, particles, sound effects, pathfinding AI
-*If* you want those things, they will be handled pretty efficiently, in comparison with you writing them yourself, unless you are extremely experienced with writing those things
-The UI is very useful for setting up large environments with lots of objects in them

All this is to say: Unity/Unreal are for making video games in the mould of modern-day video games. I.e. you have a team of between 3 and 300 people, the majority of whom can't program, pouring work into a "virtual world". This isn't much like the goals of Coot.