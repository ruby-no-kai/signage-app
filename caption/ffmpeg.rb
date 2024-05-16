#!/usr/bin/env ruby
port = ARGV[0]
channel = ARGV[1]

loop do
  p :loop
  IO.popen([*%w(ruby serve.rb signage-prd), channel, out: $stdout, err: $stderr], 'w') do |io|
    ffmpeg = spawn(*%w(ffmpeg -i), "udp://0.0.0.0:#{port}", *%w(-f mpegts -c:a pcm_s16le -vn -f s16le -ar 16000 -ac 1 -), out: io)
    w = Process.waitpid2
    Process.kill(:TERM, ffmpeg) rescue p($!)
    Process.kill(:TERM, io.pid) rescue p($!)
    w = Process.waitpid2
    p :sleep
    sleep 5
  end
end
