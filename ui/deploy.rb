#!/usr/bin/env ruby
require 'aws-sdk-s3'
#require 'aws-sdk-cloudfront'
require 'securerandom'
require 'digest/md5'
require 'logger'
require 'thread'

$stdout.sync = true

CACHE_CONTROLS = {
  'font/woff2' => 'max-age=31536000',
  'text/css; charset=utf-8' => 'max-age=31536000',
  'text/javascript; charset=utf-8' => 'max-age=31536000',
  'text/plain; charset=utf-8' => 'public, must-revalidate, max-age=0, s-maxage=0',
  'text/html; charset=utf-8' => 'public, must-revalidate, max-age=0, s-maxage=0',
  'application/json; charset=utf-8' => 'public, must-revalidate, max-age=0, s-maxage=0',
}

bucket = ARGV[0]
prefix ="ui/"
@s3 = Aws::S3::Client.new(logger: Logger.new($stdout))

abort "usage: #$0 bucket" unless bucket

srcdir = File.join(__dir__,"dist")

indexhtml = File.read(File.join(srcdir,'index.html'))
%w(
  test
  oauth2callback
  screen
  subscreen
  control/announcements
  control/screens
  control/timers
).each do |path|
  dst = File.join(srcdir,path)
  FileUtils.mkdir_p(File.dirname(dst))
  File.write "#{dst}.html", indexhtml
end

Dir[File.join(srcdir, '**', '*')].each do |path|
  next if File.directory?(path)
  key = "#{prefix}#{path[(srcdir.size + File::SEPARATOR.size)..-1].split(File::SEPARATOR).join('/')}"
    .sub(/\.html$/,'')

  case path
  when File.join(srcdir, 'index.html')
    key = "#{prefix}index.html"
  end

  content_type = case path
                 when /\.txt$/
                   'text/plain; charset=utf-8'
                 when /\.html$/
                   'text/html; charset=utf-8'
                 when /\.js$/
                   'text/javascript; charset=utf-8'
                 when /\.css$/
                   'text/css; charset=utf-8'
                 when /feed\.xml$/
                   'application/atom+xml; charset=utf-8'
                 when /\.json$/
                   'application/json; charset=utf-8'
                  when /\.woff2$/
                    'font/woff2'
                 end

    cache_control = CACHE_CONTROLS[content_type]
    File.open(path,'r') do |io|
      @s3.put_object(
        bucket: bucket,
        key: key,
        content_type: content_type,
        cache_control: cache_control,
        body: io,
      )
    end
end

