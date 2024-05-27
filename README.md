# signage3

the 3rd gen (maybe) of dedicated digital signage app for [RubyKaigi](https://rubykaigi.org). Serverless.

Some codes are inherited from [ruby-no-kai/takeout-app](https://github.com/ruby-no-kai/takeout-app) where served as a virtual venue during RubyKaigi 2021-2023.

- React + react-router-app + Chakra UI
- Built using Vite
- Storage: Amazon DynamoDB
- Sync: AWS IoT Core
- Token: Amazon Cognito Identity
    - IdP: https://github.com/sorah/himari via Amazon Cognito User Pool

## Deployment

Deployment: https://github.com/ruby-no-kai/rubykaigi-net/tree/master/tf/signage-app

## Development


### Generating `/config.json` in local machine

`config.json` contains exported terraform variables such as IAM role ARNs for browsers. In production, this is exported to S3 bucket by Terraform. In local environment, you need to create one in `ui/public/` directory. This can be done using terraform output command.

For instance in rubykaigi-net//tf/signage-app,

```
cd ~/git/github.com/ruby-no-kai/rubykaigi-net/tf/signage-app
terraform output -json dev|jq .frontend_config > ~/git/github.com/ruby-no-kai/signage-app/ui/public/config.json
```
