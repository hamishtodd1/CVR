from coot import *
import json

# pdbFileString = "/home/htodd/autobuild/Linux-localhost.localdomain-pre-release-gtk2-python/share/coot/data/tutorial-modern.pdb";
# pdbFileString = "/home/htodd/CVR/data/6eoj.pdb";
pdbFileString = "/home/htodd/CVR/data/drugIsInteresting.pdb";
# pdbFileString = "/home/htodd/CVR/data/iain/3f5m_final.pdb"
# pdbFileString = "/home/htodd/CVR/data/1mru.pdb"
handle_read_draw_molecule_with_recentre(pdbFileString, 1)

# mtzFileString = "/home/htodd/autobuild/Linux-localhost.localdomain-pre-release-gtk2-python/share/coot/data/rnasa-1.8-all_refmac1.mtz"
# make_and_draw_map( mtzFileString, "FWT", "PHWT", "", 0, 0)
mapFileString = "/home/htodd/CVR/data/drugIsInteresting.map";
handle_read_ccp4_map( mapFileString, 0 ) #second arg is whether it's a difference map

def connect(self):
	#could reset here?

	modelImol = 0
	modelMsg = {'command':"model"}
	modelMsg['modelDataString'] = str( get_bonds_representation(modelImol) )
	self.write_message( modelMsg )

	# mapMsg = {'command':"mapFilename",'mapFilename':'data/tutorial.map'}
	# mapMsg = {'command':"mapFilename",'mapFilename':'data/emd_3908.map'}
	mapMsg = {'command':"mapFilename",'mapFilename':'data/drugIsInteresting.map'}
	self.write_message( mapMsg )


	# mapMsg = {'command':"map"}
	# imolMap = imol_refinement_map();

	# temporaryFileName = "export.map" #Paul could speed this up
	# export_map(imolMap, temporaryFileName)
	# temporaryFile = open(temporaryFileName)
	# mapMsg['dataString'] = temporaryFile

	# self.write_message( mapMsg )


#you have to use ["thing"] rather than .thing. Changeable, but not trivially
def command(self, msgContainer):
	msg = eval(msgContainer)

	if msg["command"] == "deleteAtom":
		delete_atom(msg["imol"],msg["chainId"],msg["resNo"],msg["insertionCode"],msg["name"],msg["altloc"]);
		self.write_message(msgContainer);

	elif msg["command"] == "getEnvironmentDistances":
		returnMsg = {"command":"environmentDistances"}
		returnMsg["data"] = get_environment_distances_representation_py( 
			msg["imol"], [ msg["chainId"], msg["resNo"], msg["insertionCode"] ] )
		returnMsg["imol"] = msg["imol"]
		self.write_message( returnMsg )

	elif msg["command"] == "moveAtom":
		set_atom_attribute(msg["imol"], msg["chainId"], msg["resNo"], msg["insertionCode"], msg["name"], msg["altloc"], "x", msg["x"]);
		set_atom_attribute(msg["imol"], msg["chainId"], msg["resNo"], msg["insertionCode"], msg["name"], msg["altloc"], "y", msg["y"]);
		set_atom_attribute(msg["imol"], msg["chainId"], msg["resNo"], msg["insertionCode"], msg["name"], msg["altloc"], "z", msg["z"]);

	elif msg["command"] == "autoFitBestRotamer":
		imolMap = imol_refinement_map();
		clashFlag = 1;
		lowestProbability = 0.01;

		auto_fit_best_rotamer(
			msg["resNo"], msg["altloc"], msg["insertionCode"],msg["chainId"],msg["imol"],
			imolMap, clashFlag, lowestProbability);

		returnMsg = {"command":"residueInfo"}
		returnMsg["atoms"] = residue_info_py( msg["imol"],msg["chainId"], msg["resNo"], msg["insertionCode"] );
		returnMsg["imol"] = msg["imol"]
		self.write_message(returnMsg)

	elif msg["command"] == "mutateAndAutoFit":
		imolMap = imol_refinement_map();

		mutate_and_auto_fit( 
			msg["resNo"], msg["chainId"],msg["imol"], imolMap, msg["newResidue"])

		returnMsg = {"command":"residueCorrectionFromMutateAndAutofit"}
		returnMsg["atomList"] = residue_info(msg["imol"],msg["chainId"], msg["resNo"], msg["insertionCode"] );
		
		print(returnMsg)
		# self.write_message(str(returnMsg))

	# (0, [['A', 88, ''], ['A', 89, ''], ['A', 90, '']])
		

	#-------------Stats
	# cis_peptides()

	#-------------Refinement stuff
	elif msg["command"] == "commenceRefinement":
		startedStatus = refine_residues_py(msg["imol"], msg["residues"] )

		if startedStatus == False:
			print("disallowed refinement???")

	elif msg["command"] == "requestingIntermediateAtoms":
		#did we decide to just do this periodically? :/
		sendIntermediateRepresentation(self)

	elif msg["command"] == "ceaseRefinement":
		sendIntermediateRepresentation(self)
		accept_regularizement()

	elif msg["command"] == "forceRestraint":
		print("happenning")
		atomSpec = [msg["imol"], msg["chainId"], msg["resNo"], msg["insertionCode"], msg["name"], msg["altloc"]]
		drag_intermediate_atom_py(atomSpec,msg["newPosition"])

	# elif msg["command"] == "rejectRefinement":
	# 	clear_atom_pull_restraint()
	# 	clear_up_moving_atoms()
	#	sendIntermediateRepresentation(self)

	# residue_distortions(imol, residueSpecList)


	#--------------Spectation stuff
	elif msg["command"] == "requestingSpectatorData":
		# view-matrix
		spectatorDataMessage = {
			"command":"spectatorCameraUpdate",
			"position":[0,0,0],
			"quaternion":[0,0,0,1],
			"pointsOnMouseRay0":[0,0,0],
			"pointsOnMouseRay1":[0,0,0],
		}
		self.write_message(returnMsg)

	elif msg["command"] == "vrSpectatorData":
		msg["vrHeadPosition"]
		# set-view-matrix

	else:
		print('received unrecognized message:', msg,msg["command"])

def sendIntermediateRepresentation(self):
	intermediateRepresentation = get_intermediate_atoms_bonds_representation()
	print("getting intermediate represenation")
	if intermediateRepresentation != False:
		print("and sending it too")
		returnMsg = {
			"command":"intermediateRepresentation",
			"imol":0, #hem hem
			"intermediateRepresentation":intermediateRepresentation
		}
		self.write_message(returnMsg)
	else:
		print("but not sending it")