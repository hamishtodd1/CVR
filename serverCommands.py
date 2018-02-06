#you have to use ["thing"] rather than .thing. Changeable, but not trivially

def command(self, msgContainer, runningInCoot):
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
	elif messageHeader == "autoFitBestRotamer":

		if runningInCoot == False:
			print("requires coot")
		else:
			imolMap = imol_refinement_map();
			clashFlag = 1;
			lowestProbability = 0.01;

			auto_fit_best_rotamer(
				msg["resNo"], msg["altloc"], msg["insertionCode"],msg["chainId"],msg["imol"],
				imolMap, clashFlag, lowestProbability);

			returnMsg = {"command":"autoFitBestRotamerResult"}
			returnMsg["atomList"] = residue_info(msg["imol"],msg["chainId"], msg["resNo"], msg["insertionCode"] );

			print(returnMsg)
			# self.write_message(str(returnMsg))
		

	elif messageHeader == "mutateAndAutoFit":

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
		print('received unrecognized message:', message,messageHeader)

	'''
	Also useful
	pepflip-active-residue
	%coot-listener-socket
	active_residue()
	add-molecule
	view-matrix
	set-view-matrix
	'''