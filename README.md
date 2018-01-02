# Integreat
An integration layer for node.js.

[![npm Version](https://img.shields.io/npm/v/integreat.svg)](https://www.npmjs.com/package/integreat)
[![Build Status](https://travis-ci.org/integreat-io/integreat.svg?branch=master)](https://travis-ci.org/integreat-io/integreat)
[![Coverage Status](https://coveralls.io/repos/github/integreat-io/integreat/badge.svg?branch=master)](https://coveralls.io/github/integreat-io/integreat?branch=master)
[![Dependency Status](https://dependencyci.com/github/integreat-io/integreat/badge)](https://dependencyci.com/github/integreat-io/integreat)

**Note:** This project is still in an early stage. We encourage trying it out
and experimenting with it, and we highly appreciate feedback, but know that
anything might change. At this time, we welcome input on the overall thoughts
and interface, but we're not ready for pull requests yet.

The basic idea of Integreat is to make it easy to define a set of data sources
and expose them through one interface, to abstract away the specifics of each
source, and map their data to defined datatypes.

This is done through adapters, that does all the hard work of communicating with
the different sources, a definition format, for setting up each source with the
right adapter and parameters, and a `dispatch()` function to send actions to the
sources.

Integreat has an internal router that will ensure that the action is directed to
the right source through action handlers, and will also queue actions when
appropriate. The queueing features will probably be extracted as a middleware at
some point, but the functionality will stay the same.

It is possible to set up Integreat to treat one source as a store/buffer for
other sources, and schedule syncs between the store and the other sources.

Finally, there will be different interface modules available, that will plug
into the `dispatch()` function and offer other ways of reaching data from the
sources – such as out of the box REST or GraphQL apis.

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

Data from the sources is retrieved, normalized, and mapped by the adapter, and
returned asynchronously back to the code that initiated the action. Actions for
fetching data will be executed right away.

Actions that updates data on sources will reversely map and serialize the data
before it is sent to a source. These actions may be queued or scheduled.

Integreat comes with a [standard data format](#the-data-format), which is the
only format that will be exposed to the code dispatching the actions. The
mapping, normalizing, and serializing will happing to and from this format,
according to the defined datatypes and mapping rules.

Planned changes:
- Move mappings out of source definitions
- Extract queue functionality out of Integreat core package

## Install
Requires node v8.

Install from npm:

```
npm install integreat
```

## Hello world
The hello world example of Integreat, would look something like this:

```javascript
const integreat = require('integreat')
const adapters = integreat.adapters('json')

const datatypes = [{
  id: 'message',
  plural: 'messages',
  source: 'helloworld',
  attributes: {text: 'string'}
}]

const sources = [{
  id: 'helloworld',
  adapter: 'json',
  endpoints: [
    {options: {uri: 'https://api.helloworld.io/json'}}
  ],
  mappings: {
    message: {
      attributes: {text: {path: 'message'}}
    }
  }
}]

const great = integreat({datatypes, sources}, {adapters})
const action = {type: 'GET', payload: {type: 'message'}}

great.dispatch(action).then((data) => console.log(data.attributes.text))
//--> Hello world
```

As most hello world examples, this is a bit too trivial a use case to
demonstrate the real usefulness of Integreat, but shows the simplest setup
possible.

The example requires an imagined api at 'https://api.helloworld.io/json',
returning the following json data:
```json
{
  "message": "Hello world"
}
```

## Datatype definitions
To do anything with Integreat, you need to define one or more datatypes. They
describe the data you expected to get out of Integreat. A type will be
associated with a source, which is used to retrieve data for the type.

```
{
  id: <string>,
  plural: <string>,
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

The convention is to use singular mode for the `id`. The `plural` property is
optional, but it's good practice to set it to the plural mode of the `id`, as
some interfaces may use it. For instance,
[`integreat-api-json`](https://github.com/integreat-io/integreat-api-json) uses
it to build a RESTful endpoint structure, and will append an _s_ to `id` if
`plural` is not set – which may be weird in some cases.

## Source definitions
Source definitions are at the core of Integreat, as they define the sources to
fetch data from, how to map this data to a set of items to make available
through Integreat's data api, and how to send data back to the source.

A source definition object defines the adapter, any authentication method, the
endpoints for fetching from and sending to the source, and mappings to the
supported datatypes (attributes and relationships):

```
{
  id: <string>,
  adapter: <string>,
  auth: <auth id>,
  handleMeta: <boolean|sourceId>,
  baseUri: <uri>,
  endpoints: [
    <endpoint definition>,
    ...
  ],
  mappings: {
    <datatype>: <mapping definition>,
    ...
  },
  beforeRetrieve: <hook>,
  afterRetrieve: <hook>,
  beforeSend: <hook>,
  afterSend: <hook>
}
```

Source definitions are passed to Integreat on creation through the `integreat()`
function. To add sources after creation, pass a source definition to the
`great.setSource()` method. There is also a `great.removeSource()` method, that
accepts the id of a source to remove.

### Endpoint definition
```
{
  id: <string>,
  type: <string>,
  scope: <'collection'|'member'>,
  action: <action type>,
  options: {...}
}
```

An endpoint may specify none or more of the following match properties:
- `id`: A request may include an `endpoint` property, that will be matched
  against this `id`. For request with an endpoint id, no other matching
  properties will be considered
- `type`: When set, the endpoint will only be used for requests for the
  specified item type
- `scope`: May be `member` or `collection`, to specify that the endpoint should
  be used to request one item (member) or an entire collection of items.
  Setting this to `member` will require an `id` property in the request.
  Not setting this property signals an endpoint that will work for both
- `action`: May be set to the type string of an action. The endpoint will match
  only actions of this type

Endpoints are matched to a request by picking the matching endpoint with highest
level of specificity. E.g., for a GET request asking for resources of type
`entry`, an endpoint with `action: 'GET'` and `type: 'entry'` is picked over an
endpoint matching all GET requests.

Properties are matched in the order they are listed above, so that when two
endpoints matches – e.g. one with a scope and the other with an action, the one
matching with scope is picked. When two endpoints are equally specified with the
same match properties specified, the first one is used.

When no match properties are set, the endpoint will match any requests, as long
as no other endpoints match.

Unlike the match properties, the `options` property is required. This should be
an object with properties to be passed to the adapter as part of a request. The
props are completely adapter specific, so that each adapter can dictate what
kind of information it will need, but there are a set of recommended props to
use when they are relevant:

- `uri`: A uri template, where e.g. `{id}` will be placed with the value of the
parameter `id` from the request. For a full specification of the template
format, see
[Integreat URI Template](https://github.com/kjellmorten/great-uri-template).

- `path`: A path into the data, specific for this endpoint. It will usually
point to an array, in which the items can be found, but as mappings may have
their own `path`, the endpoint path may point to an object from where the
different mapping paths point to different arrays.

- `method`: An adapter specific keyword, to tell the adapter which method of
transportation to use. For adapters based on http, the options will typically
be `PUT`, `POST`, etc. The method specified on the endpoint will override any
method provided elsewhere. As an example, the `SET` action will use the `PUT`
method as default, but only if no method is specified on the endpoint.

### Mapping definition
```
{
  path: <string>,
  attributes: {
    <attrKey>: {
      path: <string>,
      param: <string>,
      format: <format pipeline>
    }
  },
  relationships: {
    <relKey>: {
      path: <string>,
      param: <string>,
      format: <format pipeline>
    }
  },
  qualifier: <string>,
  transform: <transform pipeline>,
  filterFrom: <filter pipeline>,
  filterTo: <filter pipeline>
}
```

`id`, `createdAt`, or `updatedAt` should be defined as attributes on
the `attributes` property, but will be moved to the item on mapping. If any of
these are not defined, default values will be used; a UUID for `id` and the
current timestamp for `createdAt` and `updatedAt`.

Data from the source may come in a different format than what is
[required by Integreat]((#the-data-format)), so specify [a `path`](#paths) to
point to the right value for each attribute and relationship. These values will
be cast to the right datatype after all mapping, transforming, and formatting is
done. The value of each attribute or relationship should be in a format that can
be coerced to the type defined in the datatype. The `format` pipeline may be
used to accomplish this, but it is sufficient to return something that can be
cast to the right type. E.g. returning `'3'` for an integer is okay, as
Integreat will cast it with `parseInt()`.

There is a special "catch all" datatype `*` – the asterisk – that will match
any datatype not represented as regular mappings. If `path`, `transform`,
`filterFrom`, or `filterTo` are set on an asterisk item, they will be applied as
normal, but any `attributes` or `relationships` will be disregarded. Instead all
`attributes` or `relationships` will be mapped as is, unless the `transform`
pipeline modifies them.

The `param` property is an alternative to specifying a `path`, and refers to a
param passed to the `retreive` method. Instead of retrieving a value in the
source data, an attribute or relationship with `param` will get its value from
the corresponding parameter. When setting data to a source, this
attribute/relationship will be disregarded.

Most of the time, your `attributes` and `relationships` definitions will only
have the `path` property, so providing the `path` string instead of an object
is a useful shorthand for this. I.e. `{title: 'article.headline'}` translates to
`{title: {path: 'article.headline'}}`.

Right now, mappings are part of the source definition. They may be separated in
the future, as they belong to both datatypes and sources, and this will also
simplify source definitions, but the format of the mapping definition will
probably not change much.

### Paths
Mappings, attributes, and relationships all have an optional `path` property,
for specifying what part of the data from the source to return in each case.
(Endpoints may also have a `path` property, but not all adapters support this.)

The `path` properties use a dot notation with array brackets.

For example, with this data returned from the source ...
```javascript
const data = {
  sections: [
    {
      title: 'First section',
      articles: {
        items: [
          {id: 'article1', title: 'The title', body: {content: 'The text'}}
        ],
        ...
      }
    }
  ]
}
```

... a valid path to retrieve all `items` of the first instance of `sections`
would be `'sections[0].articles.items[]'` and to get the content of each item
`'body.content'`.

The bracket notation offers some possibilities for filtering arrays:
- `[]` - Matches _all_ items in an array
- `[0]` - Matches the item at index 0
- `[1:3]` - Matches all items from index 1 to 3, not including 3.
- `[-1]` - Matches the last item in the array.
- `[id="ent1"]` - Matches the item with an id equal to `'ent1'`

When mapping data _to_ the source, the paths are used to reconstruct the data
format the source expects. Only properties included in the paths will be
created, so any additional properties must be set by a transform function or the
adapter.

Arrays are reconstructing with any object or value at the first index, unless a
single, non-negative index is specified in the path.

You may optionally supply alternative paths by providing an array of paths. If
the first one does not match any properties in the data, the next path is tried,
and so on.

### Qualifiers
When a source returns data for several datatypes, Integreat needs a way to
recognize which datatype to use for each item in the data. For some sources,
the different datatypes may be find on different paths in the data, so
specifying different paths on each mapping is sufficient. But when all items
are returned in one array, for instance, you need to specify qualifiers for
the mappings.

A qualifier is simply a path with an expression that will evaluate to true or
false. If a mapping has qualifiers, it will only be applied to data that
satisfies all its qualifiers. Qualifiers are applied to the data at the
mapping's path, before it is mapped and transformed.

An example of two mappings with qualifiers:
```
...
mappings: {
  entry: {
    attributes: {...},
    qualifier: 'type="entry"'
  },
  admin: {
    attributes: {...},
    qualifier: [
      'type="account"',
      'permissions.roles[]="admin"'
    ]
  }
}
```

When a qualifier points to an array, the qualifier returns true when at least
one of the items in the array satisfies the condition.

### Configuring metadata
If a source may receive metadata, set the `handleMeta` property to `true` and
include endpoints matching the `GET_META` and `SET_META` actions.

You may define a `meta` [mapping](#mapping-definition) to define how to map
metadata from and to the source, or you may let the asterisk type handle it.
If you define neither, it will be assumed that the source will provide and
accept metadata in the same format as Integreat:

```
{
  id: <sourceId>,
  type: 'meta',
  createdAt: <date>,
  updatedAt: <date>,
  attributes: {
    <key>: <value>
  }
}
```

You also need to define a datatype for the type `meta`, where the metadata is
defined as attributes. This type is used across all sources, so skip the
`source` property on the type. It will usually make no sense to specify default
values for metadata.

```
{
  id: 'meta',
  attributes: {
    <metadataKey>: {
      type: <string>,
      default: <object>
    }
  }
}
```

A source may also delegate metadata to another source. This is useful, as it
allows for storing metadata for sources that have no support for it. In this
case, set the `handleMeta` property to the id of the source handling metadata.
Any mapping should be defined on the handling source.

Finally, you may set `handleMeta` to `false` to signal that no metadata should
be stored for this source.

## Actions
Actions are serializable objects that are dispatched to Integreat, and may be
queued when appropriate. It is a key point that they are serializable, as they
allows them to be put in a database persisted queue and be picked up of another
Intergreat instance in another process.

An action looks like this:
```
{
  type: <actionType>,
  payload: <payload>,
  schedule: <schedule object>
}
```

`type` is one [of the action types](#available-actions) that comes with
Integreat and `payload` are data for this action. `schedule` is a
[schedule definition](#schedule-definition) (the fully parsed format from
Later).

### Returned from actions
Retrieving from a source will return an object of the following format:

```
{
  status: <statusCode>,
  data: <object>
  error: <string>
}
```

The `status` will be one of the following status codes:
- `ok`: Everything is well, data is returned as expected
- `queued`: The action has been queued
- `notfound`: Tried to access a resource/endpoint that does not exist
- `noaction`: The action did nothing
- `timeout`: The attempt to perform the action timed out
- `autherror`: An authentication request failed
- `noaccess`: Authentication is required or the provided auth is not enough
- `error`: Any other error

On `ok` status, the retrieved data will be set on the `data` property. This will
usually be mapped data in [Integreat's data format](#the-data-format), but
essentially, the data format depends on which action it comes from.

In case of any other status than `ok` or `queued`, there will be no `data`, and
instead the `error` property will be set to an error message, usually returned
from the adapter.

`data` and `error` will never be set at the same time.

The same principles applies when an action is sending data or performing an
action other than receiving data. On success, the returned `status` will be
`ok`, and the `data` property will hold whatever the adapter returns. There is
no guaranty on the returned data format in these cases.

### The data format
Items will be in the following format:

```
{
  id: <string>,
  type: <datatype>,
  createdAt: <date>,
  updatedAt: <date>,
  attributes: {
    <attrKey>: <value>,
    ...
  },
  relationships: {
    <relKey>: {id: <string>, type: <datatype>},
    <relKey: [{id: <string>, type: <datatype>, ...],
    ...
  }
}
```

`id`, `type`, `createdAt`, and `updatedAt` are mandatory and created by
Integreat even when there are no mappings to these fields. In the future,
`createdAt` and `updatedAt` may become properties of `attributes`, but will
still be treated in the same way as now.

### Available actions

#### `GET`
Get items from a source. Returned in the `data` property is an array of mapped
object, in [Integreat's data format](#the-data-format).

Example GET action:
```javascript
{
  type: 'GET',
  payload: {
    type: 'entry'
  }
}
```

In the example above, the source is inferred from the payload `type` property.
Override this by supplying the id of a source as a `source` property.

By providing an `id` property on `payload`, the item with the given id and type
is fetched, if it exists.

The endpoint will be picked according to the matching properties, unless an
endpoint id is supplied as an `endpoint` property of `payload`.

#### `GET_RAW`
Gets any data returned from the source, using the given `uri` in the `payload`.
Returned in the `data` property is whatever is returned from the adapter,
without any mapping at all.

Note that the data is not normalized, so there is no guaranty that the data
will even be a JavaScript object. In most cases, [`GET_UNMAPPED`](#get_unmapped)
is a better choice, as it will normalize the data first. In fact, `GET_RAW` may
be removed in future versions of Integreat.

Example GET_RAW action:
```javascript
{
  type: 'GET_RAW',
  payload: {
    uri: 'http://api.com/entries',
    source: 'entries'
  }
}
```

In the example above, the source is specified by the payload `source` property.
GET_RAW does not support inferring source from type.

#### `GET_UNMAPPED`
Get data from a source without applying the mapping rules. Returned in the
`data` property is an array of normalized objects in the format retrieved from
the source. The data is not mapped in any way, and the only thing guarantied, is
that this is a JavaScript object.

This action does not require a `type`, unlike the `GET` action, as it won't
lookup mappings for any given type. The only reason to include a `type` in the
payload, would be if the endpoint uri requires a `type` parameter.

Furthermore, a `source` property is required, as there is no `type` to infer
from.

Example GET action:
```javascript
{
  type: 'GET_UNMAPPED',
  payload: {
    source: 'store',
    endpoint: 'get'
  }
}
```

The endpoint will be picked according to the matching properties, unless an
endpoint id is supplied as an `endpoint` property of `payload`.

#### `GET_META`
Get metadata for a source. Normal endpoint matching is applied, but it's
common practice to define an endpoint matching the `GET_META` action.

The action returns an object with a `data` property, which contains the `source`
(the source id) and `meta` object with the metadata set as properties.

Example GET_META action:
```javascript
{
  type: 'GET_META',
  payload: {
    source: 'entries',
    keys: ['lastSyncedAt', 'status']
  }
}
```

This will return data in the following form:
```javascript
{
  status: 'ok',
  data: {
    source: 'entries',
    meta: {
      lastSyncedAt: '2017-08-19T17:40:31.861Z',
      status: 'ready'
    }
  }
}
```

If the action has no `keys`, all metadata set on the source will be retrieved.
The `keys` property may be an array of keys to retrieve several in one request,
or a single key.

Note that the source must be set up to handle metadata. See
[Configuring metadata](#configuring-metadata) for more.

#### `SET`
Send data to a source. Returned in the `data` property is whatever the adapter
returns.

The data to send is provided in the payload `data` property, and must given as
an array of objects in [Integreat's data format](#the-data-format).

Example SET action:
```javascript
{
  type: 'SET',
  payload: {
    source: 'store',
    data: [
      {id: 'ent1', type: 'entry'},
      {id: 'ent5', type: 'entry'}
    ]
  }
}
```

In the example above, the `source` is specified in the payload. Specifying a
`type` to infer the source from is also possible, but not recommended, as it
may be removed in future versions of Integreat.

The endpoint will be picked according to the matching properties, unless an
endpoint id is supplied as an `endpoint` property of `payload`.

#### `SET_META`
Set metadata on a source. Returned in the `data` property is whatever the
adapter returns. Normal endpoint matching is used, but it's common practice to
set up an endpoint matching the `SET_META` action.

The payload should contain the `source` to get metadata for (the source id), and
a `meta` object, with all metadata to set as properties.

Example SET_META action:
```javascript
{
  type: 'SET_META',
  payload: {
    source: 'entries',
    meta: {
      lastSyncedAt: Date.now()
    }
  }
}
```

Note that the source must be set up to handle metadata. See
[Configuring metadata](#configuring-metadata) for more.

#### `DELETE`
Delete data for several items from a source. Returned in the `data` property is
whatever the adapter returns.

The data for the items to delete, is provided in the payload `data` property,
and must given as an array of objects in
[Integreat's data format](#the-data-format), but note that the attributes and
relationships are not required.

Example DELETE action:
```javascript
{
  type: 'DELETE',
  payload: {
    source: 'store',
    data: [
      {id: 'ent1', type: 'entry'},
      {id: 'ent5', type: 'entry'}
    ]
  }
}
```

In the example above, the `source` is specified in the payload. Specifying a
`type` to infer the source from is also possible.

Example DELETE action for one item:
```javascript
{
  type: 'DELETE',
  payload: {
    id: 'ent1',
    type: 'entry'
  }
}
```

The endpoint will be picked according to the matching properties, unless an
endpoint id is supplied as an `endpoint` property of `payload`.

The method used for the request defaults to `POST` when `data` is set, and
`DELETE` for the `id` and `type` option, but may be overridden on the endpoint.

#### `RUN`
This action runs a job with a specified `worker`, giving it a `params` object.
Everything from there on, is up to the worker, including what will be returned
as `data` if the worker runs without errors.

Currently, Integreat comes with one worker, named [`sync`](#the-sync-job).

Example RUN action:
```javascript
{
  type: 'RUN',
  payload: {
    worker: 'sync',
    params: {
      from: 'entries',
      to: 'store',
      type: 'entry',
      retrieve: 'all'
    }
  }
}
```

In the example above, the `sync` job is run, with the `params` it needs to sync
from one source to another. The format of the `params` object varies from worker
to worker.

## Adapters
Interface:
- `send({uri, [data], [auth], [method], [headers]})`
- `normalize(data, [path])`
- `serialize(data, [path])`

Available adapters:
- `json` (built in)

There's also a package for using the json adapter with a CouchDB/Cloudant db:
[`integreat-source-couchdb`](https://github.com/kjellmorten/integreat-source-couchdb).

## Hooks
Hooks are functions that will be called on specific occasions, as a chance to
modify the inner workings of Integreat. You may for instance set up a
`beforeSend` hook, to alter the data sent to a source.

A hook function will be passed either a `request` or a `response` object, and
any changes to these will have an effect. All hooks will receive a `resources`
object as the second argument, which will hold the `source` in question.

Any return values from hook functions will by disregarded.

Available hooks:

### `beforeRetrieve (request, resources)`
Called just before data is retrieved from a source. The `request` object will
consist of `uri` and `path`.

### `afterRetrieve (response, resources)`
Called just after data has been retrieved from a source, but before it is
serialized and mapped. The `response` object consists of `status`, `data`, and
any `error` returned from the source.

### `afterNormalize (response, resources)`
Called just after data from a source has been normalized, but before it has
been mapped. The `response` object consists of `status`, `data`, and any
`error`.

### `beforeSerialize (request, resources)`
Called just before the data going to a source is serialized, but after it has
been mapped. The `request` object consists of `uri`, `method`, `path`, and
`data`.

### `beforeSend (request, resources)`
Called just before data is sent to a source, after it has been mapped and
normalized. The `request` object consists of `uri`, `method`, and `data`.

### `afterSend (response, resources)`
Called just after data has been sent to a source, with the `response` containing
`status`, `data`, and any `error` returned from the source.

## Authentication
Definition format:
```
{
  id: <id>,
  strategy: <strategy id>,
  options: {
    ...
  }
}
```

At runtime, the specified strategy is used to authenticate requests. The
strategy is given the `options` payload and returns an object with the
following interface:

```javascript
{
  isAuthenticated () {},    // Returns true when authenticated
  await authenticate () {}, // Returns true when authenticated
  getAuthObject () {},      // Returns auth information as an object
  getAuthHeaders () {}      // Returns auth headers as an object
}
```

## Pipeline functions
- Item `transform(item)`
- Item `filter(item)`
- Attribute `format(value)`

Default formats:
- `date`
- `float`
- `integer`
- `not`

## Running jobs
The jobs interface accepts id of a `worker` and a `params` object passed to the
worker. There are a couple of workers included in Integreat, like `sync` and
`deleteExpired`. A job may be dispatched as a `RUN` action, with the job definition as
the payload.

To schedule jobs, [schedule definitions](#schedule-definition) may be passed to
the `schedule` method of the Integreat instance. Each schedule consists of some
properties for defining the schedule, and an action to be dispatched.

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
The `sync` job will retrieve items from one source and set them on another. There
are different options for how to retrieve items, ranging from a crude retrieval
of all items on every sync, to a more fine grained approach where only items
that have been updated since last sync, will be synced.

The simplest job definition would look like this, where all items would be
retrieved from the source and set on the target:
```
{
  worker: 'sync',
  params: {
    from: <sourceId>,
    to: <targetid>,
    type: <itemType>,
    retrieve: 'all'
  }
}
```

The job will dispatch a 'GET' action right away, and then immediately dispatch
a 'SET_META' action to update the `lastSyncedAt` date on the source. The
actions to update the target is added to the queue, and may be handled by other
workers, depending on your setup.

To retrieve only new items, change the `retrieve` property to `updated`. In
this case, the job will get the `lastSyncedAt` from the `from` source, and get
only newer items, by passing it the `updatedAfter` param. The job will also
filter out older items, in case the source does not support `updatedAfter`.

### The deleteExpired job
With an endpoint for getting expired items, the `deleteExpired` job will fetch
these and delete them from the source. The endpoint may include param for the
current time, either as microseconds since Januar 1, 1970 UTC with param
`{timestamp}` or as the current time in the extended ISO 8601 format
(`YYYY-MM-DDThh:mm:ss.sssZ`) with the `{isodate}` param. To get a time in the
future instead, set `msFromNow` to a positive number of milliseconds to add
to the current time, or set `msFromNow` to a negative number to a time in the
past.

Here's a typical job definition:
```
{
  worker: 'deleteExpired',
  params: {
    source: 'store',
    type: 'entry',
    endpoint: 'getExpired',
    msFromNow: 0
  }
}
```

This will get and map items of type `entry` from the `getExpired` endpoint on
the source `store`, and delete them from the same source. There is no default
`endpoint` for this worker, as the consequence of delete all items received
from the wrong endpoint could be quite severe.

Example endpoint uri template for `getExpired` (from a CouchDB source):
```
{
  uri: '/_design/fns/_view/expired?include_docs=true{&endkey=timestamp}',
  path: 'rows[].doc'
}
```

## Debugging
Run Integreat with env variable `DEBUG=great`, to receive debug messages.

Some sub modules sends debug messages with the `great:` prefix, so use
`DEBUG=great,great:*` to catch these as well.
