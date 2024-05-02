# Rulebricks – Node SDK

[![npm shield](https://img.shields.io/npm/v/@flatfile/api)](https://www.npmjs.com/package/@flatfile/api)

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

async function main() {
  const rulebricks = new RulebricksClient({
    // This is usually the environment specific "Secret Key" that can be found
    // on the Getting Started page in the Flatfile dashboard.
    token: 'YOUR_API_KEY',
  });
}
```

## Handling errors

When the API returns a non-success status code (4xx or 5xx response), a subclass of `RulebricksApiError` will be thrown:

```ts
try {
  await client.agents.get("environment-id", "agent-id");
} catch (err) {
  if (err instanceof RulebricksApiError) {
    console.log(err.statusCode); // 400
    console.log(err.message); // "BadRequestError"
    console.log(err.body); // list of errors
  }
}
```

Error codes are as followed:

| Status Code | Error Type                 |
| ----------- | -------------------------- |
| 400         | `BadRequestError`          |
| 404         | `NotFoundError`            |


## Contributing

This library is generated programmatically. We suggest [opening an issue](https://github.com/rulebricks/node-sdk/issues) to discuss any issues or feature requests with us.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.
