import tornado.ioloop
import tornado.web
import tornado.websocket

import imp

port = 9090
import os
runningInCoot = False
if os.name == 'posix':
	serverReactions = imp.load_source('serverReactionsName', '/home/htodd/CVR/serverReactions.py')
	ip = "192.168.56.101"
	runningInCoot = True
else:
	ip = "localhost"
print("websocket (NOT address bar) link: " + ip + ":" + str(port))

class wsHandler(tornado.websocket.WebSocketHandler):
	def check_origin(self, origin):
		return True
		
	def open(self):
		print('Opened connection')
		if runningInCoot == False:
			self.write_message({"command":"loadTutorialModel"})

			mapMsg = {'command':"mapFilename",'mapFilename':'data/tutorialMap.map'}
			self.write_message( mapMsg )
		else:
			serverReactions.connect(self)

	def on_message(self, msgContainer):
		#get runningInCoot here
		if runningInCoot:
			serverReactions.command(self, msgContainer)

	def on_close(self):
		print('Closed connection')

application = tornado.web.Application([(r'/ws', wsHandler)])
application.listen(port)

#---------------So that you can ctrl+c
isClosing = False
def signalHandler(signum, frame):
	global isClosing
	isClosing = True
def tryExit(): 
	global isClosing
	if isClosing:
		tornado.ioloop.IOLoop.instance().stop()
import signal
signal.signal(signal.SIGINT, signalHandler)
tornado.ioloop.PeriodicCallback(tryExit, 100).start()

tornado.ioloop.IOLoop.instance().start()