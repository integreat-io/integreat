# Integreat
An integration layer for node.js.

**Note:** This project is still in a very early stage. Use at own risk. Anything might change.

The basic idea of Integreat is to make it easy to define a set of data sources and expose them through one interface to abstract away the specifics of each source.

This is done through adapters, that does all the hard work of communicating with the different sources, a definition format, for setting up each source with the right adapter and parameters, and a `dispatch()` function to send actions to the sources.

Integreat has an internal router that will ensure that the right action is directed to the right source(s). This router may be set up to treat one source as a relay for other sources, and there's a sync module for keeping data in sync between selected sources.

Finally, there will be different interface modules available, that will plug into the `dispatch()` function and offer other ways of reaching data from the sources – such as out of the box REST or GraphQL apis.

```
            ___________________________
           |         Integreat         |
           |                           |
           |                  |-> Adapter <-> Source
Action -> Dispatch -> Router -|        |
           |                  |-> Adapter <-> Source
           |                           |
           |___________________________|
```

Data from the sources is retrieved, normalized, and mapped by the adapter, and returned asynchronously back to the code that initiated the action. Actions for fetching data will be executed right away.

Actions that updates data on sources will reversely map and serialize the data before it is sent to a source. These actions may be queued.

Integreat comes with a standard data format, which is the only format that will be exposed to the code dispatching the actions. The mapping, normalizing, and serializing will happing to and from this format.


## Install
Requires node v7.

Install from npm:

```
npm install integreat
```

## Use

```
const integreat = require('integreat')

const types = [<typeDef>, <typeDef>]
const sources = [<sourceDef>, <sourceDef>]
const adapters = {json: require('integreat/adapters/json')}
const great = integreat({types, sources, adapters})

const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

great.dispatch(action)
.then((item) => {
  ...
})
```

## Type definitions
To do anything with Integreat, you need define one or more types. They describe
the datatypes you expected to get out of Integreat. A type will be associated
with a source, which is used to retrieve data for the type.

```
{
  id: <string>,
  source: <sourceId>,
  attributes: {
    <attrId>: {
      type: <string>,
      default: <object>
    }
  },
  relationships: {
    <relId>: {
      type: <string>,
      default: <object>
    }
  }
}
```

## Source definitions
Source definitions are at the core of Integreat, as they define the sources to
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
    one: <endpoint|string>,
    all: <endpoint|string>,
    some: <endpoint|string>,
    send: <endpoint|string>
  }
  auth: <auth id>,
  items: [
    <item definition>,
    ...
  ]
}
```

### Endpoint definition

```
{
  uri: <string>,
  path: <string>
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
      default: {
        from: <object>,
        to: <object>
      },
      map: <map pipeline>
    }
  },
  relationships: {
    <relId>: {
      type: <string>,
      path: <string>,
      default: {
        from: <string>,
        to: <string>
      },
      map: <function>
    }
  },
  map: <map pipeline>,
  filter: {
    from: <filter pipeline>,
    to:  <filter pipeline>
  }
}
```

`id`, `createdAt`, or `updatedAt` should be defined as attributes on
the `attributes` property, but will be moved to the item on mapping. If any of
these are not defined, default values will be used; a UUID for `id` and the
current timestamp for `createdAt` and `updatedAt`.

The `type` of an attribute is added to the end of attribute's map pipeline. All
standard attribute types have corresponding mappers that ensure the target value
will be in the right format.

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
