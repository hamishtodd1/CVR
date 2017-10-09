import urllib.request

stringArray = ["leucine","alanine","serine","glycine","valine","glutamic acid","arginine","threonine", "asparagine","aspartic acid","cysteine","glutamine","histidine","isoleucine","lysine","methionine", "phenylalanine","proline","tryptophan","tyrosine"]

for ourString in stringArray:
	print("going to get " + ourString)
	urlString = ourString.replace( " ", "%20")
	urllib.request.urlretrieve("https://bavotasan.com/demos/text-to-image.php?text=" + urlString + "&submit=Text+to+Image", ourString + ".png")