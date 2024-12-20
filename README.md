![Banner](banner.png)

<p>
    <a href="https://www.npmjs.com/package/@rulebricks/api" alt="npm shield">
        <img src="https://img.shields.io/npm/v/@rulebricks/api" /></a>
    <a href="https://github.com/rulebricks/node-sdk" alt="License">
        <img src="https://img.shields.io/github/license/rulebricks/node-sdk" /></a>
</p>

## Documentation

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

## Forge Module

The Forge module provides a fluent interface for creating and managing rules in your Rulebricks workspace. It offers a type-safe way to define rules, fields, conditions, and dynamic values.

### Rule Creation

```typescript
import { Rule, DynamicValues } from '@rulebricks/api/forge';

// Configure your workspace
const rulebricks = new RulebricksClient({
  apiKey: 'your-api-key',
  environment: 'https://rulebricks.com',
});

// Create a new rule
const rule = new Rule()
  .setName("Health Insurance Account Selector")
  .setDescription("Assists individuals in selecting the most suitable health insurance account option.")
  .setWorkspace(rulebricks);

// Add fields to capture request data
rule
  .addNumberField("age", "Age of individual", 0)
  .addBooleanField("has_chronic_condition", "Has any chronic conditions", false)
  .addNumberField("annual_income", "Annual income in USD", 0)
  .addStringField("preferred_hospital", "Preferred hospital name")
  .addListField("current_medications", "List of current medications");

// Add response fields
rule
  .addStringResponse("recommended_plan", "Recommended insurance plan")
  .addNumberResponse("monthly_premium", "Monthly premium amount")
  .addBooleanResponse("hsa_eligible", "Eligible for Health Savings Account");

// Create conditions using when() and any()
rule
  .when({
    age: ["greater_than", 65],
    has_chronic_condition: ["equals", true]
  })
  .then({
    recommended_plan: "Medicare Advantage Plus",
    monthly_premium: 175.50,
    hsa_eligible: false
  });

rule
  .any({
    annual_income: ["less_than", 30000],
    has_chronic_condition: ["equals", true]
  })
  .then({
    recommended_plan: "Essential Care Plus",
    monthly_premium: 125.00,
    hsa_eligible: true
  });

// Save the rule to your workspace
await rule.update();
```

### Dynamic Values

The Forge module also supports dynamic values that can be managed across your workspace:

```typescript
import { DynamicValues } from '@rulebricks/api/forge';

// Configure dynamic values with your workspace
DynamicValues.configure(rulebricks);

// Set dynamic values
await DynamicValues.set({
  max_deductible: 5000,
  min_premium: 50,
  available_plans: ["Basic", "Standard", "Premium"]
});

// Get a dynamic value reference
const maxDeductible = await DynamicValues.get("max_deductible");

// Use dynamic values in rules
rule
  .when({
    annual_income: ["greater_than", 50000]
  })
  .then({
    monthly_premium: maxDeductible
  });
```

### Type Safety

The Forge module is built with TypeScript and provides type safety throughout:

```typescript
import { Rule, DynamicValueType } from '@rulebricks/api/forge';

// Field types are enforced
rule.addNumberField("age", "Age of individual", "invalid"); // TypeScript error
rule.addBooleanField("is_active", "Is account active", 0); // TypeScript error

// Condition operators are type-safe
rule.when({
  age: ["contains", "value"], // TypeScript error: 'contains' not valid for number fields
  is_active: ["greater_than", true] // TypeScript error: 'greater_than' not valid for boolean fields
});
```

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
