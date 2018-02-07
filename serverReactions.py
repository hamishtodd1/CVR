runningInCoot = True
try:
	get_map_radius()
except NameError:
	runningInCoot = False
	print("Not running in coot")

def connect(self):
	self.set_nodelay(True)

	print('Opened connection')

	if runningInCoot == False:
		self.write_message({"command":"loadTutorialModel"})

		mapMsg = {'command':"map",'mapFilename':'data/tutorialMap.map'}
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

		mapMsg = {'command':"map"}
		imolMap = imol_refinement_map();

		temporaryFileName = "export.map" #Paul could speed this up
		export_map(imolMap, temporaryFileName)
		mapMsg['mapFilename'] = temporaryFileName

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

	# elif msg["command"] == "moveAtom":

	# 	if runningInCoot:
	# 		set_atom_attribute(msg["imol"], msg["chainId"], msg["resNo"], msg["insertionCode"], msg["name"], msg["altloc"], "x", msg["x"]);
	# 		set_atom_attribute(msg["imol"], msg["chainId"], msg["resNo"], msg["insertionCode"], msg["name"], msg["altloc"], "y", msg["y"]);
	# 		set_atom_attribute(msg["imol"], msg["chainId"], msg["resNo"], msg["insertionCode"], msg["name"], msg["altloc"], "z", msg["z"]);
	# 	else:
	# 		print("movement of atom permitted")
	# 	self.write_message(msg);


	#needs an atom's worth of stuff evidently
	#it wants imol_coords, which we expect is imol
	elif msg["command"] == "autoFitBestRotamer":

		if runningInCoot == False:
			print("requires coot")
		else:
			imolMap = imol_refinement_map();
			clashFlag = 1;
			lowestProbability = 0.01;

			auto_fit_best_rotamer(
				msg["resNo"], msg["altloc"], msg["insertionCode"],msg["chainId"],msg["imol"],
				imolMap, clashFlag, lowestProbability);

			returnMsg = {"command":"atomMovements"}
			returnMsg["atomList"] = residue_info(msg["imol"],msg["chainId"], msg["resNo"], msg["insertionCode"] );

			print(returnMsg["atomList"])
			# self.write_message(str(returnMsg))
		

	elif msg["command"] == "mutateAndAutoFit":

		if runningInCoot == False:
			print("requires coot")
		else:
			imolMap = imol_refinement_map(); #not necessarily

			mutate_and_auto_fit( 
				msg["resNo"], msg["chainId"],msg["imol"],imolMap, msg["residue"])

			returnMsg = {"command":"residueCorrectionFromMutateAndAutofit"}
			returnMsg["atomList"] = residue_info(msg["imol"],msg["chainId"], msg["resNo"], msg["insertionCode"] );
			
			print(returnMsg)
			# self.write_message(str(returnMsg))

	elif msg["command"] == "printThis":

		if runningInCoot == False:
			print("requires coot")
		else:
			imolMap = imol_refinement_map(); #not necessarily

			mutate_and_auto_fit( 
				msg["resNo"], msg["chainId"],msg["imol"],imolMap, msg["residue"])

			returnMsg = {"command":"residueCorrectionFromMutateAndAutofit"}
			returnMsg["atomList"] = residue_info(msg["imol"],msg["chainId"], msg["resNo"], msg["insertionCode"] );
			
			print(returnMsg)
			# self.write_message(str(returnMsg))

	# if msg["command"] == "getEnvironmentDistances":
	# 	envDistances = get_environment_distances_representation_py(imol, residue_spec)
	# 	print(envDistances)

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