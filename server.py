import tornado.ioloop
import tornado.web
import tornado.websocket

import serverReactions
class wsHandler(tornado.websocket.WebSocketHandler):
	def check_origin(self, origin):
		return True
		
	def open(self):
		serverReactions.connect(self)

	def on_message(self, msgContainer):
		serverReactions.command(self, msgContainer)

	def on_close(self):
		print('Closed connection')

port = 9090
import os
if os.name == 'posix':
	print("localhost:" + str(port))
else:
	print("192.168.56.1:" + str(port))

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