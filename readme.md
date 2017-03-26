# [WIP] json-deref

Dereference JSON-reference in a JSON document

## Installation

`npm install json-deref`

## Overview

Let's say you have the following JSON Schema:

```json
{
  "description": "Just some JSON schema.",
  "title": "Basic Widget",
  "type": "object",
  "properties": {
    "id": {
      "$ref": "#/definitions/id"
    },
    "foo": {
      "$ref": "#/definitions/foo"
    },
    "bar": {
      "$ref": "bar.json"
    }
  },
  "definitions": {
    "id": {"$ref": "common-definitions.json#definitions/id"},
    "foo": {"$ref": "common-definitions.json#definitions/foo"}
  }

}
```

Sometimes you just want that schema to be fully expanded, with `$ref`'s being their (true) resolved values:

```json
{
  "description": "Just some JSON schema.",
  "title": "Basic Widget",
  "type": "object",
  "properties": {
    "id": {
      "description": "unique identifier",
      "type": "string",
      "minLength": 1,
      "readOnly": true
    },
    "foo": {
      "description": "foo property",
      "readOnly": true,
      "type": "number"
    },
    "bar": {
      "description": "bar property",
      "type": "boolean"
    }
  },
  "definitions": {
    "id": {
      "description": "unique identifier",
      "type": "string",
      "minLength": 1,
      "readOnly": true
    },
    "foo": {
      "description": "foo property",
      "readOnly": true,
      "type": "number"
    }
  }

}
```

or you could also just want to parse external references

```json
{
  "description": "Just some JSON schema.",
  "title": "Basic Widget",
  "type": "object",
  "properties": {
    "id": {
      "$ref": "#/definitions/id"
    },
    "foo": {
      "$ref": "#/definitions/foo"
    },
    "bar": {
      "description": "bar property",
      "type": "boolean"
    }
  },
  "definitions": {
    "id": {
      "description": "unique identifier",
      "type": "string",
      "minLength": 1,
      "readOnly": true
    },
    "foo": {
      "description": "foo property",
      "readOnly": true,
      "type": "number"
    }
  }

}
```

This utility lets you do that:


```js
import deref from 'json-deref'
import mySchema from 'schema.json'

deref(mySchema).then(fullSchema => {
  console.dir(fullSchema) // the fully parsed schema
})

deref(mySchema, {externalOnly: true}).then(onlyLocals => {
  console.dir(onlyLocals) // only external refs parsed
})

```

## API Reference

### deref(schema, options, fn)

Derefs `$ref`'s in JSON to actual resolved values. Supports local, file and web refs.


| Param | Type | Description |
| --- | --- | --- |
| schema | `Object` / `string` | The schema object or schema url |
| options | `Object` | options |
| options.baseURL | `String` | url base in case schema object doesn't define $id |
| options.cache | `boolean` / `object`| Defines wheather cache is used or explicitly sets it. Default: `false`. |
| options.cacheTTL | `number` | Cache max-age (todo) |
| options.loaders | `object` | Object whose key name defines loader protocol to override/add and value is the loader `function` called with arguments (url, defaultLoader). |
| options.externalOnly | `Boolean` | If true local references are left intact. Default: `false`.|
