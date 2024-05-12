require 'socket'
require 'logger'
require 'thread'

require 'aws-sdk-iotdataplane'
require 'aws-sdk-transcribestreamingservice'
require 'json'

# ffmpeg -i ... -vn -f s16le -ar 16000 -ac 1 - | ruby serve.rb a |& tee -a /tmp/serve
# ffmpeg -i udp://0.0.0.0:10000 -f mpegts -c:a pcm_s16le -vn -f s16le -ar 16000 -ac 1 - | ruby serve.rb a |& tee -a /tmp/serve
class StdinInput
  def initialize
    @on_data = proc { }
  end

  def on_data(&block)
    @on_data = block
    self
  end

  def start
    @th = Thread.new do
      $stdin.binmode
      $stderr.puts({binmode?: $stdin.binmode?}.inspect)
      until $stdin.eof?
        buf = $stdin.read(32000) # 256Kb
        @on_data.call buf
      end
    end.tap { _1.abort_on_exception = true }
  end
end

class TranscribeEngine
  def initialize()
    @client = Aws::TranscribeStreamingService::AsyncClient.new(region: 'ap-northeast-1')
    @input_stream = Aws::TranscribeStreamingService::EventStreams::AudioStream.new
    @output_stream = Aws::TranscribeStreamingService::EventStreams::TranscriptResultStream.new

    @output_stream.on_bad_request_exception_event do |exception|
      raise exception
    end

    @output_stream.on_event do |event|
      p event unless event.is_a?(Aws::TranscribeStreamingService::Types::TranscriptEvent)
    end
  end

  attr_reader :output_stream

  def feed(audio_chunk)
    @input_stream.signal_audio_event_event(audio_chunk: audio_chunk)
    self
  rescue Seahorse::Client::Http2ConnectionClosedError
    @client.connection.errors.each do |e|
      p e
    end
    raise
  end

  def start
    vocabulary_name = ENV.fetch('TRANSCRIBE_VOCABULARY_NAME', 'rk_2021_words')
    vocabulary_name = nil if vocabulary_name.empty?
    @client.start_stream_transcription(
      language_code: ENV.fetch('TRANSCRIBE_LANGUAGE_CODE', 'en-US'),

      enable_partial_results_stabilization: true,
      partial_results_stability: 'high',

      media_encoding: "pcm",
      media_sample_rate_hertz: 16000,

      vocabulary_name: vocabulary_name,

      input_event_stream_handler: @input_stream,
      output_event_stream_handler: @output_stream,
    )
  end

  def finish
    @input_stream.signal_end_stream
  end

  def on_transcript_event(&block)
    output_stream.on_transcript_event_event(&block)
    self
  end
end

CaptionData = Data.define(:result_id, :is_partial, :transcript)

class GenericOutput
  def initialize()
   @data_lock = Mutex.new
    @data = {}
  end

  def feed(event)
    @data_lock.synchronize do
      event.transcript.results.each do |result|
        caption = CaptionData.new(
          result_id: result.result_id,
          is_partial: result.is_partial,
          transcript: result.alternatives[0]&.transcript,
        )
        @data[result.result_id] = caption if caption.transcript
      end
    end
  end

  def start
    @th = Thread.new do
      loop do
        begin
          data = nil
          @data_lock.synchronize do
            data = @data
            @data = {}
          end

          data.each do |k, caption|
            handle(caption)
          end
        end
        sleep 0.7
      end
    end.tap { _1.abort_on_exception = true }
  end
end


class IotDataPlaneOutput < GenericOutput
  def initialize(topic_prefix:, track:)
    @track = track
    @topic = "#{topic_prefix}/uplink/all/captions/#{track}"
    @iotdataplane = Aws::IoTDataPlane::Client.new(logger: Logger.new($stdout))

    @next_sequence_num = Time.now.to_i << 20
    @sequence_map = {}

    super()
  end

  def handle(caption)
    sequence = get_sequence_info(caption.result_id)
    sequence.round += 1

    payload = {
      kind: "Caption",
      track: @track,
      pid: $$,
      sequence_id: sequence.id,
      round: sequence.round,
      result_id: sequence.result_id,
      is_partial: caption.is_partial,
      transcript: caption.transcript,
    }
    @iotdataplane.publish(
      topic: @topic,
      qos: 0,
      retain: false,
      payload: JSON.generate(payload),
    )

    @sequence_map.delete(caption.result_id) unless caption.is_partial
  end

  SequenceInfo = Struct.new(:id, :result_id, :round)
  def get_sequence_info(result_id)
    @sequence_map[result_id] ||= begin
      @next_sequence_num = @next_sequence_num.succ & 9007199254740991 # Number.MAX_SAFE_INTEGER
      SequenceInfo.new(@next_sequence_num, result_id, 0)
    end
  end
end

class StderrOutput < GenericOutput
  def handle(caption)
    $stderr.puts caption.to_h.to_json
  end
end

class Watchdog
  NO_AUTO_RESTART_HOURS = ((0..9).to_a + (21..23).to_a).map { (_1 - 9).then { |jst|  jst < 0 ? 24+jst : jst } }

  def initialize(timeout: 1800, enabled: false)
    @timeout = timeout
    @last = Time.now.utc
    @enabled = enabled
  end

  attr_accessor :enabled

  def alive!
    @last = Time.now.utc
  end

  def start
    @th ||= Thread.new do
      loop do
        sleep 15
        now = Time.now.utc
        if (now - @last) > @timeout
          $stderr.puts "Watchdog engages!"
          next if NO_AUTO_RESTART_HOURS.include?(now.hour)
          if @enabled
            $stderr.puts "doggo shuts down this process"
            raise
          end
        end
      end
    end.tap { _1.abort_on_exception =  true }
  end
end


topic_prefix, track = ARGV[0,2]
warn "Usage for IoT: #$0 topic_prefix track" unless topic_prefix && track

watchdog = Watchdog.new(enabled: ARGV.delete('--watchdog'))
watchdog.start()

input = StdinInput.new
engine = TranscribeEngine.new
output = topic_prefix && track ? IotDataPlaneOutput.new(topic_prefix:, track:) : StderrOutput.new

input.on_data do |chunk|
  p now: Time.now, on_audio: chunk.bytesize
  engine.feed(chunk)
end

engine.on_transcript_event do |e|
  watchdog&.alive!
  output.feed(e)
end
# TODO: graceful restart

begin
  output.start
  call = engine.start
  input.start
  p call.wait.inspect
rescue Interrupt
  engine.finish
end
