require 'aws-sdk-s3'
S3_BUCKET = ENV.fetch('S3_BUCKET', 'rk-live-video')
DOIT = ARGV.delete('--doit')

@s3 = Aws::S3::Client.new(region: ENV['AWS_REGION'] || 'ap-northeast-1')

prefix = ARGV[0] or abort "Usage: #$0 prefix [--doit]"
hours = (9..18)


@s3.list_objects_v2(bucket: S3_BUCKET, prefix:).each do |page|
  page.contents.each do |object|
    next if hours.cover?(object.last_modified.localtime.hour)
    puts "Deleting #{object.key} @ #{object.last_modified} #{DOIT ? '' : ' (dryrun)'}"
    @s3.delete_object(bucket: S3_BUCKET, key: object.key) if DOIT
  end
end
