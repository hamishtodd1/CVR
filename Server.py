#http://www.remwebdevelopment.com/blog/python/simple-websocket-server-in-python-144.html

import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.template

#---------imports that are probably specific to our setup
import pyautogui
import os
os.chdir("C:\cootVRrelated\CVR") #or, you know, wherever it is

class mainHandler(tornado.web.RequestHandler):
	def get(self):
		loader = tornado.template.Loader(".")
		self.write(loader.load("index.html").generate())

class wsHandler(tornado.websocket.WebSocketHandler):
	def check_origin(self, origin):
		return True

	def open(self):
		print('connection opened: localhost:9090, or maybe 172.20.10.124')
		'''
		currently it's 172.20.10.124:9090
		type in "window.location.reload(true)" on the remote debugging console if it's not reloading. Ctrl+refresh once worked too
		'''
		self.set_nodelay(True) #doesn't hurt to have this hopefully...
		self.write_message("This is the server, connection has been accepted")
		debug = True
		
	def on_message(self, message):
		#time to send the next one. TODO make it sooner
		if message == "mousePositionPlease":
			mouseX, mouseY = pyautogui.position()
			self.write_message( str(mouseX) + "," + str(mouseY) )
		else:
			self.write_message("Didn't understand that")
			print('received unrecognized message:', message)

	def on_close(self):
		print('connection closed...')
		#tornado.ioloop.IOLoop.instance().stop()

application = tornado.web.Application([
	(r'/ws', wsHandler), #The websocket
	(r'/', mainHandler), #The page
	(r"/(.*)", tornado.web.StaticFileHandler, {"path": "."}), #the files
] ) #can put ", debug = True" in there

#to properly reload, need to open the chrome debugger for the device, click in the right place so the window is selected apparently, and ctrl+F5

#if __name__ == "__main__":
print("go to localhost:9090") #or the thing listed as your ipv4 address under Wireless LAN adapter wifi in ipconfig
application.listen(9090)
tornado.ioloop.IOLoop.instance().start()
	
#note that we need to be able to continue coot running and have things passed from coot to this
#but like... will there be a wait before coot gets back to you?