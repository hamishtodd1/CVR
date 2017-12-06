'''
Update procedure:
   Switch virtual machine connection mode to whatever it is normally (NAT?)
	in gitcoot/coot, git pull
	in gitcoot/build, bash CIH (sets the configure stuff up?)
	in gitcoot/build, make -j 4
	in gitcoot/build, make install
	in coot-Linux (?) it should be there

Running procedure:
   Switch virtual machine connection mode to host-only
   hostname -I gets ip address to put in browser
   For no graphics: /home/htodd/auto.../bin/coot --no-graphics -s CVR/Server.py
   To get out of coot:
      ctrl C
      ctrl D

Workflow: save script, change window, ctrl+C to finish script in coot, ctrl+D to exit coot, up and enter to re-run coot
Need to optimize this workflow.

One option:send python functions from javascript. Might end up doing this anyway.  

'''

Atom
----
   Fix atom (as in anchor it down)
   Clear Fixed atom(s)
   Delete Atom
   Label (on and off) *

Single Residue
--------------
   
		#select two atoms, present one suggested change
   Regularize
   Rigid-body fit *
   
   Autofit-rotamer * #similar to above, but doesn't even ask for acceptance
   Rotamers #Autofit could be effortless, just the automatic one is highlighted more and you can instantly press a button to accept it
   
   Mutate and Autofit-rotamer #send the spec of the picked atom then "mutate_and_autofit"
   
		#trivial
   Delete residue
   Add terminal residue
      
   Torsions
   Triple-Refine * #one up, central residue, one down. T key. Interesting.
   Base Pairing
   Pep-flip * #just select, send to coot. pepflip. Trivial
   Sidechain 180 rotate
   Add Alt-conformer
   Protein Ligand Interactions (say, Environment Distances)

Residue Range
-------------
   Delete Residue Range
   Refine Resize Range * #How big do the ranges get? This could be effortless, just dragging the refiner along
   Mutate Residue Range
   Rigid-body fit
   Replace Fragment
   Renumber Residue Range (tricky)
   Change ChainID of residue range (tricky)
   
   #everything that's closer than 1.6A is bonded

Sphere
------
		#any difference between this and "neightbourhood" for residue?
   Sphere Refine (How to show updating intermediate atoms and how to pull on them?
                  This is the most tricky thing) * #Indeed this is interesting. Probably will work different to coot

Chain
-----
   Chain Refine #how is this different to residue range refine?
   NCS Ghosts (on and off) #??

Molecule
-------
   Copy Molecule #probably needs to happen in the "server" (coot)?
   Merge Molecules
   Change Representation (e.g. to CA-mode and back again) #interesting

Nothing
-------
   Place Helix Here * #stick one on their belt
   Place Strand Here #????
   Add Solvent Molecule Here #needs typing

Maps
----
   Set Active Map #what does that do?
   Set Scrollable Map
   Change the contour level

Map & Molecule
--------------
   Add waters #probably one for the server

Views
----
   Save and recall views (displayed molecules, orientation, zoom, colours) #interesting, suggests that eg lantern is bad idea. But maybe this is the bad idea, people don't "save a view" of a cake they're making

2D Objects
----------
   Various Validation Graphs #???
   Ramachandran Plot2D Objects #cool, for navigating the thing

* = of particular importance