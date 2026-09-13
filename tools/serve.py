#!/usr/bin/env python3
"""Serve the game on localhost so it can be installed as an app.

Service workers (and therefore offline play / home-screen install) only run in a
secure context, which means http://localhost - not a file:// path.

    python3 tools/serve.py            # http://localhost:8000
    python3 tools/serve.py 9000       # pick a port

To install on a phone on the same Wi-Fi, use the LAN address it prints. iOS
Safari needs Share -> Add to Home Screen; Chrome offers an Install prompt.
"""
import http.server, os, socket, socketserver, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')   # always serve fresh while developing
        super().end_headers()
    def log_message(self, *a):
        pass

def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80)); return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', PORT), H) as httpd:
    print(f'  local:  http://localhost:{PORT}')
    print(f'  phone:  http://{lan_ip()}:{PORT}   (same Wi-Fi)')
    print('  ctrl-c to stop')
    httpd.serve_forever()
