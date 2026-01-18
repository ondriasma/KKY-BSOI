import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.log
from urllib.request import urlopen
import datetime as dt
import logging
from recognize_handler import RecognizeImageHandler
import json
import os

tornado.log.enable_pretty_logging()
app_log = logging.getLogger("tornado.application")

USER_DB = "users.json"

def load_users():
    if not os.path.exists(USER_DB): return {}
    with open(USER_DB, "r") as f: return json.load(f)

def save_users(users):
    with open(USER_DB, "w") as f: json.dump(users, f)

class RootHandler(tornado.web.RequestHandler):
    def get(self):
        #self.write("Hello World")
        self.redirect("static/index.html")


class ReceiveImageHandler(tornado.web.RequestHandler):
    def post(self):
        # Convert from binary data to string
        received_data = self.request.body.decode()

        assert received_data.startswith("data:image/png"), "Only data:image/png URL supported"

        # Parse data:// URL
        with urlopen(received_data) as response:
            image_data = response.read()

        app_log.info("Received image: %d bytes", len(image_data))

        # Write an image to the file
        with open(f"images/img-{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}.png", "wb") as fw:
            fw.write(image_data)


class RegisterHandler(tornado.web.RequestHandler):
    def post(self):
        data = json.loads(self.request.body)
        username = data.get("username")
        password = data.get("password")
        
        users = load_users()
        if username in users:
            self.set_status(400)
            self.write({"status": "error", "message": "User already exists"})
        else:
            users[username] = password
            save_users(users)
            self.write({"status": "ok"})

class LoginHandler(tornado.web.RequestHandler):
    def post(self):
        data = json.loads(self.request.body.decode("utf-8"))
        username = data.get("username")
        password = data.get("password")
        
        users = load_users()
        if users.get(username) == password:
            self.write({"status": "ok"})
        else:
            self.set_status(401)
            self.write({"status": "error", "message": "Wrong username or password"})

class LogoutHandler(tornado.web.RequestHandler):
    def get(self):
        self.redirect("/")

application = tornado.web.Application([
    (r'/', RootHandler),
    (r"/receive_image", ReceiveImageHandler),
    (r"/recognize", RecognizeImageHandler),
    (r"/static/(.*)", tornado.web.StaticFileHandler, {"path": "static/"}),
    (r"/register", RegisterHandler),
    (r"/login", LoginHandler),
    (r"/logout", LogoutHandler),
])

if __name__ == '__main__':
    http_server = tornado.httpserver.HTTPServer(application, ssl_options={
        "certfile": "cert.pem",
        "keyfile": "key.pem",
        "ca_certs": "fullchain.pem",
    })
    http_server.listen(443)
    tornado.ioloop.IOLoop.instance().start()
