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

great.start()
.then(() => {
  // Your code
})
```

## Mapping definitions

Mapping definitions are the core of Integreat, as they define the sources to
retrieve data from, and how to map this data to a set of items to make available
through Integreat's data api.

A mapping definition object defines the source, the target (mapping to
attributes and relationships), and the sync (basically when to retrieve):

```
{
  source: <source definition>,
  target: <target definition>,
  sync: <sync definition>
}
```

### Source definition

```
{
  type: <string>,
  endpoint: <uri>,
  path: <string>,
  transform: <function>,
  filter: <function>
}
```

### Target definition

```
{
  type: <string>,
  attributes: {
    <attrId>: {
      path: <string>,
      defaultValue: <object>,
      parse: <function>,
      transform: <function>,
      format: <function>
    }
  },
  relationships: {
    <relId>: {
      path: <string>,
      type: <string>,
      defaultValue: <string>,
      parse: <function>,
      transform: <function>
    }
  },
  transform: <function>,
  filter: <function>
}
```

### Sync definition

## Adapters

Interface:
- `retrieve()`

Available adapters:
- json

## Map functions

- Source `transform()`
- Source `filter()`
- Attribute `parse()`
- Attribute `transform()`
- Attribute `format()`
- Target `transform()`
- Target `filter()`

Parsers:
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
