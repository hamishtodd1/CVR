#note: would be faster if they were also resized to the right size

import urllib.request

stringArray = ["to be or not to be that is the sexton whether tis nobler in the sex to suffer the sex of sexy sex"]

for ourString in stringArray:
	print("going to get " + ourString)
	urlString = ourString.replace( " ", "%20")
	urllib.request.urlretrieve("https://bavotasan.com/demos/text-to-image.php?text=" + urlString + "&submit=Text+to+Image", ourString + ".png")