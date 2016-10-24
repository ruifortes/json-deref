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

Derefs <code>$ref</code>'s in JSON to actual resolved values. Supports local, file and web refs.


| Param | Type | Description |
| --- | --- | --- |
| json | <code>Object</code> | The JSON schema |
| options | <code>Object</code> | options |
| options.baseFolder | <code>String</code> | the base folder to get relative path files from. Default is <code>process.cwd()</code> |
| options.cache | <code>String</code> | whether to cache the result from the request. Default: <code>true</code>. |
| options.requireStartSlash | <code>boolean</code> | If set requires json-pointer start slash. Default: <code>false</code>. |
| options.localLoader | <code>function</code> | local pointer loader function with signature <code>function (pointer, params, defaultLoader)</code>. <code>pointer</code> - is the local json-pointer. <code>params</code> - params is the json-reference object without the <code>$ref</code> property. <code>defaultLoader</code> - defaultLoader function accepts a json-pointer string and retrieves the parsed target.|
| options.externalLoader | <code>function</code> | external reference loader function with signature <code>function (url, params, defaultLoader)</code>. works similar to localLoader but with the url part of <code>$ref</code>|
| options.failOnMissing | <code>Boolean</code> | By default missing / unresolved refs will be left as is with their ref value intact. If set to <code>true</code> we will error out on first missing ref that we cannot resolve. Default: <code>false</code>. |
| options.externalOnly | <code>Boolean</code> | By default missing / unresolved refs will be left as is with their ref value intact. If set to <code>true</code> we will error out on first missing ref that we cannot resolve. Default: <code>false</code>. |
| options.jsonResources | <code>Object</code> | object containing json reources accesible with <code>{"#ref": "json:[key]#definitions/email"}</code> |
