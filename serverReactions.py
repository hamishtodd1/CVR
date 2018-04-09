from coot import *

runningInCoot = True
try:
	coot_version()
except NameError:
	runningInCoot = False
	print("Not running in coot")

def connect(self):
	self.set_nodelay(True)

	print('Opened connection')

	if runningInCoot == False:
		self.write_message({"command":"loadTutorialModel"})

		mapMsg = {'command':"mapFilename",'mapFilename':'data/tutorialMap.map'}
		self.write_message( mapMsg )

	else:
		pdbFileString = "/home/htodd/autobuild/Linux-localhost.localdomain-pre-release-gtk2-python/share/coot/data/tutorial-modern.pdb";
		# pdbFileString = "/home/htodd/CVR/data/iain/3f5m_final.pdb"
		# pdbFileString = "/home/htodd/CVR/data/1mru.pdb"
		handle_read_draw_molecule_with_recentre(pdbFileString, 1)

		modelImol = 0
		modelMsg = {'command':"model"}
		modelMsg['modelDataString'] = str( get_bonds_representation(modelImol) )
		self.write_message( modelMsg )

		make_and_draw_map ("/home/htodd/autobuild/Linux-localhost.localdomain-pre-release-gtk2-python/share/coot/data/rnasa-1.8-all_refmac1.mtz", "FWT", "PHWT", "", 0, 0)

		# mapMsg = {'command':"map"}
		# imolMap = imol_refinement_map();

		# temporaryFileName = "export.map" #Paul could speed this up
		# export_map(imolMap, temporaryFileName)
		# temporaryFile = open(temporaryFileName)
		# mapMsg['dataString'] = temporaryFile.read()

		# print("we COULD send it")
		# print(type(mapMsg['dataString'] ))
		# exampleStr = "yo"
		# print(type(exampleStr ))

		# self.write_message( mapMsg )

		mapMsg = {'command':"mapFilename",'mapFilename':'data/tutorialMap.map'}
		self.write_message( mapMsg )

#you have to use ["thing"] rather than .thing. Changeable, but not trivially
def command(self, msgContainer):
	msg = eval(msgContainer)

	if msg["command"] == "deleteAtom":
		if runningInCoot:
			delete_atom(msg["imol"],msg["chainId"],msg["resNo"],msg["insertionCode"],msg["name"],msg["altloc"]);
		else:
			print("deletion of atom permitted")
		self.write_message(msgContainer);

	elif msg["command"] == "getEnvironmentDistances":
		returnMsg = {"command":"environmentDistances"}
		returnMsg["data"] = get_environment_distances_representation_py( 
			msg["imol"], [ msg["chainId"], msg["resNo"], msg["insertionCode"] ] )
		returnMsg["imol"] = msg["imol"]
		self.write_message( returnMsg )

	elif msg["command"] == "moveAtom":
		if runningInCoot:
			set_atom_attribute(msg["imol"], msg["chainId"], msg["resNo"], msg["insertionCode"], msg["name"], msg["altloc"], "x", msg["x"]);
			set_atom_attribute(msg["imol"], msg["chainId"], msg["resNo"], msg["insertionCode"], msg["name"], msg["altloc"], "y", msg["y"]);
			set_atom_attribute(msg["imol"], msg["chainId"], msg["resNo"], msg["insertionCode"], msg["name"], msg["altloc"], "z", msg["z"]);

	elif msg["command"] == "autoFitBestRotamer":
		print("commanded to rotamer")

		if runningInCoot == False:
			print("requires coot")
		else:
			imolMap = imol_refinement_map();
			clashFlag = 1;
			lowestProbability = 0.01;

			auto_fit_best_rotamer(
				msg["resNo"], msg["altloc"], msg["insertionCode"],msg["chainId"],msg["imol"],
				imolMap, clashFlag, lowestProbability);

			returnMsg = {"command":"residueInfo"}
			returnMsg["atoms"] = residue_info_py(msg["imol"],msg["chainId"], msg["resNo"], msg["insertionCode"] );
			returnMsg["imol"] = msg["imol"]
			self.write_message(returnMsg)

	# elif msg["command"] == "mutateAndAutoFit":

	# 	if runningInCoot == False:
	# 		print("requires coot")
	# 	else:
	# 		imolMap = imol_refinement_map(); #not necessarily

	# 		mutate_and_auto_fit( 
	# 			msg["resNo"], msg["chainId"],msg["imol"],imolMap, msg["residue"])

	# 		returnMsg = {"command":"residueCorrectionFromMutateAndAutofit"}
	# 		returnMsg["atomList"] = residue_info(msg["imol"],msg["chainId"], msg["resNo"], msg["insertionCode"] );
			
	# 		print(returnMsg)
	# 		# self.write_message(str(returnMsg))
	# (0, [['A', 88, ''], ['A', 89, ''], ['A', 90, '']])


	#-------------Refinement stuff
	elif msg["command"] == "commenceRefinement":
		startedStatus = refine_residues_py(msg["imol"], msg["residues"])
		if startedStatus == False:
			print("disallowed refinement???")

	elif msg["command"] == "requestingIntermediateAtoms":
		#did we decide to just do this periodically? :/
		sendIntermediateRepresentation(self)

	elif msg["command"] == "ceaseRefinement":
		sendIntermediateRepresentation(self)
		accept_regularizement()

	# elif msg["command"] == "forceRestraints":
	# 	for atomSpec in msg["atomSpecs"]:
	# 		drag_intermediate_atom_py(atomSpec,position)
	# 		#position is a list of 3 numbers

	# elif msg["command"] == "rejectRefinement":
	# 	clear_atom_pull_restraint()
	# 	clear_up_moving_atoms()

	else:
		print('received unrecognized message:', msg,msg["command"])

	'''
	Also useful
	pepflip-active-residue
	%coot-listener-socket
	active_residue()
	add-molecule
	view-matrix
	set-view-matrix
	'''

def sendIntermediateRepresentation(self):
	intermediateRepresentation = get_intermediate_atoms_bonds_representation()
	if intermediateRepresentation != False:
		returnMsg = {
			"command":"intermediateRepresentation",
			"imol":0, #hem hem
			"intermediateRepresentation":intermediateRepresentation
		}
		self.write_message(returnMsg)