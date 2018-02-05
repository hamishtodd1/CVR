## What is this?

This is, or will be, ["Coot"](https://www2.mrc-lmb.cam.ac.uk/personal/pemsley/coot/) in VR. Much more will be done but so far you can *view* (but not change) the state of the molecule in VR

## Why is this being made?

Because it will make Coot faster to use. *It is not for outreach.*

## How do I use this?

It's extremely hard right now. You'll need Windows(not my fault, there is no desktop VR outside windows). You'll need an Oculus Rift and webVR (I recommend this build https://drive.google.com/open?id=0BzudLt22BqGRRElMNmVqQjJWS2c - make sure to go to chrome://flags and enable webVR AND gamepad extensions). Run the server.py script inside coot then go to localhost:9090 in your browser. When you see some stuff on the screen press ".", then put on headset and you should be there.

(firefox and chromium webvr should be ok, but test that they are working first eg with this page https://webvr.info/samples/XX-vr-controllers.html )

## Any plans for this to be compatible with other headsets?

Ok so if you have a Vive and would like to use this and it isn't working yet, email me with my github account name at gmail :) it will be trivial to extend, you could even just try commenting out the "OpenVR Gamepad" code in vrControlSystem.js...

I want this to be compatible with any headset that has *hand tracking and position tracking*. If you'd like compatibility *today* with a headset other than the Rift and Vive (eg headsets from Sony, Samsung, Lenovo, Acer, Dell, HP) then let me know! But I will need one of the headsets myself.

But no to all "Cardboard" headsets including Daydream and GearVR. In the history of this repo you will find a version compatible with daydream, but it was a nightmare to get the pointer working and it is not clear what payoff there is, apart from having a super-cheap thing available to people. Read my PhD thesis (ETA 09/2019) if you want to hear UI reasons too I guess!

## Will you have feature <x> from Coot?

I want as much of Coot's functionality in here as possible! The only things I do not currently expect to happen in here are things that require typing strings of symbols on the keyboard, eg "save as" or "fetch specific ligand from the internet".

## Are you going to have voice control?

NO STOP ASKING FOR THIS I AM A PURVEYOR OF FUTURISTIC SOFTWARE BUT I AM NOT A GENIE