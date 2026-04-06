require 'webrick'
server = WEBrick::HTTPServer.new(
  Port: 8765,
  DocumentRoot: '/Users/anademenezes/Documents/presentation_SM_2026/docs'
)
trap('INT') { server.shutdown }
server.start
