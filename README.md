# Integreat

An integration layer for node.js.

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
