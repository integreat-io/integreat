# Integreat

An integration layer for node.js.

**Note:** This project is still in a very early stage. Use at own risk. Anything might change.

Requires node v7.

## Install

Install from npm:

```
npm install integreat
```

## Use

```
const Integreat = require('integreat')

const great = new Integreat(dbConfig)

great.loadDefaults()
great.loadFromStore()

.then(() => great.start())
.then(() => {
  // Your code
})
```

## Source definitions

Source definitions are the core of Integreat, as they define the sources to
fetch data from, how to map this data to a set of items to make available
through Integreat's data api, and how to send data back to the source.

A source definition object defines how to fetch from and send to the source, the
target item (mapping to attributes and relationships), and the sync (basically
when to retrieve):

```
{
  id: <string>,
  adapter: <string>,
  baseUri: <uri>,
  endpoints: {
    one: <string>,
    all: <string>,
    some: <string>,
    send: <string>
  }
  auth: <auth id>,
  items: [
    <item definition>,
    ...
  ]
}
```

### Item definition

```
{
  type: <string>,
  path: <string>,
  attributes: {
    <attrId>: {
      type: <string>,
      path: <string>,
      defaultValue: <object>,
      map: <map pipeline>
    }
  },
  relationships: {
    <relId>: {
      type: <string>,
      path: <string>,
      defaultValue: <string>,
      map: <function>
    }
  },
  map: <map pipeline>,
  filter: <filter pipeline>
}
```

`id`, `createdAt`, or `updatedAt` should be defined as attributes on
the `attributes` property, but will be moved to the item on mapping. If any of
these are not defined, default values will be used; a UUID for `id` and the
current timestamp for `createdAt` and `updatedAt`.

The `type` of an attribute is added to the end of attribute's map pipeline. All
standard attribute types have corresponding mappers that ensure the target value
will be in the right format.

### Route definition

```
{
  <type>: <sourceId>,
  ...
}
```

### Sync definition

```
{
  from: <sourceId>,
  to: <sourceId>,
  schedule: <seconds>,
  startHour: <0-23>,
  startWeekday: <0-6>
}
```

**Note:** `startHour` and `startWeekday` are not implemented yet. Neither are
relay and push functionality.

## Adapters

Interface:
- `retrieve(endpoint)`
- `normalize(data)`

Available adapters:
- `json`

## Auth

Options format:
```
{
  id: <id>,
  strategy: <strategy id>,
  options: {
    ...
  }
}
```

Any passcodes, passwords, secret keys, etc. should be named suffixed with `_encrypt` to indicate that the field should be encrypted. The field name without the suffix and with the decoded value will be available on the options object loaded from the store.

At runtime, a strategy is created and given the options payload. An auth strategy is represented by a class with the following interface:

```
class AuthStrategy {
  constructor (options) { ... }
  isAuthenticated () { ...; return <boolean> }
  authenticate () { ...; return Promise.resolve(<boolean>) }
  getAuthHeaders () { return {header: '...'} }
}
```

## Pipeline functions

- Item `map(item)`
- Item `filter(item)`
- Attribute `map(value)`

Default mappers:
- `date`
- `float`
- `integer`

## Connect api
To get and set items stored in the integration layer, use the Connect interface.
You get this from the Integreat instance like this:

```
const entries = great.connect(<type>)
```

The Connect interface has these methods:
- `get(id)`
- `all()`
- `set(item)`

The type is implicit for all these methods, as it is set on connection. All
methods return a Promise.

Example:
```
const entries = great.connect('entry')
entries.get('ent1')
.then((entry) => { console.log(entry.attributes.title) })
```

## Events

Call `great.on()` to register listeners. The following events are available:

- `start`: Emitted after Integreat has been started. Listener is called with
http server (if started).
- `stop`: Emitted after Integreat has been stopped. Listener is called without
any arguments.
- `sync`: Emitted after a source has been synced. Called with source definition,
and array of the synced items.

## Debugging

Run Integreat with env variable `DEBUG=great`, to receive debug messages.

There are also two other debug namespaces: `great:scheduler` and `great:fetch`.
