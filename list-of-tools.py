'''
Install procedure
   You DO need pip install and you DO need to get tornado that way, within the coot python

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
   For no graphics: /home/htodd/autobuild/coot-Lin.../bin/coot --no-graphics -s CVR/Server.py
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

Single Residue - just look at changes in one residue!
--------------
   
      #
   Regularize
   Rigid-body fit *
   
   Autofit-rotamer * #similar to above, but . THIS IS ONLY WITHIN ONE RESIDUE
   Rotamers #Autofit could be effortless, just the automatic one is highlighted more and you can instantly press a button to accept it
   
   Mutate and Autofit-rotamer
   
   Delete residue
   Add terminal residue
      
   Sidechain 180 rotate
   Torsions
   Base Pairing
   Add Alt-conformer
   Protein Ligand Interactions (say, Environment Distances)

Residue Range
-------------
   Pep-flip *
   Triple-Refine *
   Delete Residue Range
   Refine Resize Range *
   Mutate Residue Range
   Rigid-body fit
   Replace Fragment
   Renumber Residue Range (tricky)
   Change ChainID of residue range (tricky)

Sphere
------
   Sphere Refine (How to show updating intermediate atoms and how to pull on them?
                  This is the most tricky thing) * #Indeed this is interesting. Probably will work different to coot

Chain
-----
   Chain Refine #how is this different to residue range refine?
   NCS Ghosts (on and off) #??

Molecule
-------
   Copy Molecule #probably needs to happen in the "server"
   Merge Molecules
   Change Representation (e.g. to CA-mode and back again) #interesting


Maps
----
   


* = of particular importance