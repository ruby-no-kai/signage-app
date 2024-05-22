# signage3

the 3rd gen (maybe) of dedicated digital signage app for [RubyKaigi](https://rubykaigi.org). Serverless.

Some codes are inherited from [ruby-no-kai/takeout-app](https://github.com/ruby-no-kai/takeout-app) where served as a virtual venue during RubyKaigi 2021-2023.

- React + react-router-app + Chakra UI
- Built using Vite
- Storage: Amazon DynamoDB
- Sync: AWS IoT Core
- Token: Amazon Cognito Identity
    - IdP: https://github.com/sorah/himari via Amazon Cognito User Pool

Deployment: https://github.com/ruby-no-kai/rubykaigi-net/tree/main/tf/signage-app
