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

```javascript
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
  auth: <auth id>,
  baseUri: <uri>,
  endpoints: {
    one: <endpoint|string>,
    all: <endpoint|string>,
    some: <endpoint|string>,
    send: <endpoint|string>
  }
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
    <attrKey>: {
      path: <string>,
      defaultTo: <object>,
      transform: <transform pipeline>
    }
  },
  relationships: {
    <relKey>: {
      path: <string>,
      defaultTo: <object>,
      transform: <function>
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

There is a special "catch all" item type `*` – the asterisk – that will match
any item type not represented in regular `items`. If `path`, `map` or `filter`
are set on an asterisk item, they will be applied as normal, but any
`attributes` or `relationships` will be disregarded. Instead all `attributes` or
`relationships` will be mapped as is, unless the item `map` modifies them.

### Paths
Endpoints, items, attributes, and relationships all have an optional `path`
property, for specifying what part of the data from the source to return in each
case.

The `path` properties use a dot notation, with the support for array brackets.

For example, with this data returned from the source ...
```javascript
const data = {
  sections: [
    {
      title: 'First section',
      articles: {
        items: [
          {id: 'article1', title: 'The title', body: {raw: 'The text'}}
        ],
        ...
      }
    }
  ]
}
```

... a valid path to retrieve all `items` of the first instance of `sections`
would be `'sections[0].articles.items[]'` and to get the raw body of each item
`'body.raw'`.

When mapping data to the source, the paths are used to reconstruct the data
format the source expects. Only properties included in the paths will be
created, so any additional properties must be set by a map function or the
adapter.

**Note:** An open square bracket `[]` is only valid at the end of an endpoint
`path`, and is used to indicate that the path refers to an array. This is used
when reconstructing the data format _to_ to a source, and has no effect when
mapping _from_ a source.

## Adapters
Interface:
- `retrieve(url, [auth])`
- `send(url, data, [auth], [method])`
- `normalize(data, [path])`
- `serialize(data, [path])`

Available adapters:
- `json`
- `couchdb`

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

At runtime, a strategy is created and given the options payload. An auth strategy is represented by a class with the following interface:

```javascript
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
- Attribute `transform(value)`

Default transforms:
- `date`
- `float`
- `integer`
- `not`

## Returned from actions
Retrieving from a source will return an object of the following format:

```
{
  status: <statusCode>,
  data: <object>
  error: <string>
}
```

The `status` will be one of the following status codes:
- `ok`
- `queued`
- `notfound`
- `noaction`
- `timeout`
- `autherror`
- `noaccess`
- `error`

On `ok` status, the retrieved data will be set on the data property. Expect this
to be an array of items, even when the action implies that one item should be
returned.

### Returned data for items
Items will be in the following format:

```
{
  id: <string>,
  type: <typeString>,
  createdAt: <date>,
  updatedAt: <date>,
  attributes: {
    <attrKey>: <value>,
    ...
  },
  relationships: {
    <relKey>: {id: <string>, type: <typeString>},
    <relKey: [{id: <string>, type: <typeString}, ...],
    ...
  }
}
```

In case of any other status than `ok` or `queued`, there will be no `data`, but
the `error` property will be set to an error message, usually returned from the
adapter.

`data` and `error` will never be set at the same time.

The same principles applies when an action is sending data or performing an
action other than receiving data. On success, the returned `status` will be
`ok`, and the `data` property will hold whatever the adapter returns. There is
no guaranty on the returned data format in these cases.

## Running jobs
The jobs interface accepts a `worker` id and a `params` object passed to the
worker. There are a couple of workers included in Integreat, like `sync` and
`expire`. A job may be dispatched as a `RUN` action, with the job definition as
the payload.

To schedule jobs, `schedule` definitions may be passed to the `schedule` method
of the Integreat instance. Each `schedule` consists of some properties for
defining the schedule, and an action to be dispatched.

### Job definition
```
{
  worker: <workerId>,
  params: {
    ...
  }
}
```

### Schedule definition

```
{
  schedule: <schedule>,
  job: <job definition>,
}
```

The `schedule` format is directly borrowed from
[Later](http://bunkat.github.io/later/schedules.html) (also accepts the basic or
composite schedule formats on the `schedule` property, as well as the [text
format](http://bunkat.github.io/later/parsers.html#text)).

The following time periods are supported:
- `s`: Seconds in a minute (0-59)
- `m`: Minutes in an hour (0-59)
- `h`: Hours in a day (0-23)
- `t`: Time of the day, as seconds since midnight (0-86399)
- `D`: Days of the month (1-maximum number of days in the month, 0 to specifies
last day of month)
- `d`: Days of the week (1-7, starting with Sunday)
- `dc`: Days of week count, (1-maximum weeks of the month, 0 specifies last in
the month). Use together with `d` to get first Wednesday every month, etc.
- `dy`: Days of year (1 to maximum number of days in the year, 0
specifies last day of year).
- `wm`: Weeks of the month (1-maximum number of weeks in the month, 0 for last
week of the month.). First week of the month is the week containing the 1st, and
weeks start on Sunday.
- `wy`: [ISO weeks of the year](http://en.wikipedia.org/wiki/ISO_week_date)
(1-maximum number of ISO weeks in the year, 0 is the last ISO week of the year).
- `M`: Months of the year (1-12)
- `Y`: Years (1970-2099)

See Later's documentation on
[time periods](http://bunkat.github.io/later/time-periods.html) for more.

Example schedule running a job at 2 am every weekday:
```javascript
{
  schedule: {d: [2,3,4,5,6], h: [2]},
  job: {
    worker: 'sync',
    params: {
      from: 'src1',
      to: 'src2',
      type: 'entry'
    }
  }
}
```

To run a job every hour, use `{m: [0]}` or simply `'every hour'`.

### The sync job
The sync job will retrieve items from one source and set them on another. There
are different options for how to retrieve items, ranging from a course retrieval
of all items on every sync, to a more fine grained approach where we're only
fetching items that have been updated since last sync.

The simplest job definition would look like this, where all items would be
retrieved from the source and set on the target:
```
{
  worker: 'sync',
  params: {
    from: <sourceid>,
    to: <targetid>,
    type: <itemtype>,
    retrieve: 'all'
  }
}
```

To retrieve only new items, change the `retrieve` property to `updated`. In
this case, the job will get the last retrieved timestamp from the source, and
get all newer items with a `GET_MANY` action.

## Debugging
Run Integreat with env variable `DEBUG=great`, to receive debug messages.

There are also two other debug namespaces: `great:queue` and `great:fetch`.
