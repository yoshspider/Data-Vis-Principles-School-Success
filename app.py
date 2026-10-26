"""Offline dashboard launcher; only listens on the local loopback interface."""
import argparse
import functools
import http.server
import pathlib
import sys
import threading
import webbrowser


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=0)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    root = pathlib.Path(getattr(sys, '_MEIPASS', pathlib.Path(__file__).parent))
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root / 'web'))
    with http.server.ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        url = f'http://127.0.0.1:{server.server_port}'
        start_url = f'{url}/story.html'
        print(f'School Success Explorer: {start_url}\nClose this window or press Ctrl+C to stop.', flush=True)
        if not args.no_browser:
            threading.Timer(0.5, webbrowser.open, args=(start_url,)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
