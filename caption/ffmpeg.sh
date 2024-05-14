#!/bin/bash -x
while true; do
  ffmpeg -i udp://0.0.0.0:$1 -f mpegts -c:a pcm_s16le -vn -f s16le -ar 16000 -ac 1 - | ruby serve.rb signage-prd $2 |& tee -a /tmp/serve.$2
  sleep 5
done
