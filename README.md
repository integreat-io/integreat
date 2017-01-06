# Integreat

An integration layer for node.js.

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

great.loadSourceDefsFromDb()

.then(() => great.start())

.then(() => {
  // Your code
})
```

## Source definitions

Source definitions are the core of Integreat, as they define the sources to
retrieve data from, and how to map this data to a set of items to make available
through Integreat's data api.

A source definition object defines how to fetch from and send to the source, the
target item (mapping to attributes and relationships), and the sync (basically
when to retrieve):

```
{
  sourcetype: <string>,
  itemtype: <string>,
  fetch: <fetch definition>,
  send: <send definition>,
  item: <item definition>,
  sync: <sync definition>
}
```

### Fetch definition

```
{
  endpoint: <uri>,
  changelog: <uri>,
  path: <string>,
  map: <map pipeline>,
  filter: <filter pipeline>
}
```

### Send definition

```
{
  endpoint: <uri>,
  map: <map pipeline>
}
```

**Note:** Send functionality is not implemented yet.

### Item definition

```
{
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

**Note:** `relationships` are not implemented yet.

### Sync definition

```
{
  schedule: <seconds>,
  startHour: <0-23>,
  startWeekday: <0-6>,
  allowRelay: <boolean>,
  allowPush: <boolean>
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

## Pipeline functions

- Fetch `map(item)`
- Fetch `filter(item)`
- Item `map(item)`
- Item `filter(item)`
- Attribute `map(value)`

Default mappers:
- `date`
- `float`
- `integer`

## Storage api
To get and set items stored in the integration layer, use the Storage interface.
You get this from the Integreat instance like this:

```
const storage = great.getStorage()
```

The interface has these methods:
- `storage.storeItem(item)`
- `storage.fetchItem(id, type)`
- `storage.fetchByType(type)`

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
