Dir.chdir("/Users/anademenezes/Documents/presentation_SM_2026/docs")
require 'webrick'
port = ENV['PORT'] || 8765
server = WEBrick::HTTPServer.new(Port: port.to_i, DocumentRoot: Dir.pwd)
trap('INT') { server.shutdown }
server.start
