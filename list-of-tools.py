'''

go into coot git pull cd ../build make then make install

Rerun autogen.sh <- not very frequent; fresh checkout
Rerun CIH.sh happens once a week
May need to go to the build directory and type make



	Question: am I the only one who has the perspective flip quite often?
	Can you be my external examiner?
	Would also be good to highlight which of these need the keyboard?
	yo, how 
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
   Delete Residue
   Add terminal residue
   
   Torsions #you said that changing phi psi was common?
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
   Ramachandran Plot2D Objects

* = of particular importance