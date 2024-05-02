# Rulebricks – Node SDK

[![npm shield](https://img.shields.io/npm/v/@rulebricks/api)](https://www.npmjs.com/package/@rulebricks/api)

The Rulebricks Node.js library provides convenient access to the Rulebricks API from JavaScript/TypeScript.

## Documentation

API reference documentation is available [here](https://rulebricks.com/docs).

## Installation

```
npm install --save @rulebricks/api
# or
yarn add @rulebricks/api
```

## Usage

```typescript
import { RulebricksClient } from '@rulebricks/api';

const rulebricks = new RulebricksClient({
  apiKey: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
});

const rulebricks = new RulebricksClient({
  apiKey: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
  environment: 'https://rulebricks.com',
});

rulebricks.rules.solve('tJOCd8XXXX', {
  customer_id: 'anc39as3',
  purchase_history: ['t-shirt', 'mug'],,
  account_age_days: 4,
  last_purchase_days_ago: 3,
  email_subscription: false,
}, {
  // Request options (Optional, leave empty for default values)
  // timeoutInSeconds: 10, (Optional: Use this to override the default timeout in seconds)
  // maxRetries: 3, (Optional: Use this to override the default number of retries)
}).then((result) => {
  console.log(result);
}).catch((err) => {
  console.error(err);
});
```

## Handling errors

When the API returns a non-success status code (4xx or 5xx response), a subclass of `RulebricksApiError` will be thrown:

```ts
try {
    // ...
} catch (err) {
    if (err instanceof RulebricksApiError) {
        console.log(err.statusCode); // 400
        console.log(err.message); // "BadRequestError"
        console.log(err.body); // list of errors
    }
}
```

Error codes are as followed:

| Status Code | Error Type            |
| ----------- | --------------------- |
| 400         | `BadRequestError`     |
| 429         | `RateLimitError`      |
| 500         | `InternalServerError` |

## Contributing

This library is generated programmatically. We suggest [opening an issue](https://github.com/rulebricks/node-sdk/issues) to discuss any issues or feature requests with us.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.
