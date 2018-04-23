# ![Integreat](media/logo.png)

An integration layer for node.js.

[![npm Version](https://img.shields.io/npm/v/integreat.svg)](https://www.npmjs.com/package/integreat)
[![Build Status](https://travis-ci.org/integreat-io/integreat.svg?branch=master)](https://travis-ci.org/integreat-io/integreat)
[![Coverage Status](https://coveralls.io/repos/github/integreat-io/integreat/badge.svg?branch=master)](https://coveralls.io/github/integreat-io/integreat?branch=master)
[![Maintainability](https://api.codeclimate.com/v1/badges/a5bd9841a47ff9f74577/maintainability)](https://codeclimate.com/github/integreat-io/integreat/maintainability)

**Note:** We're still in an early stage, although some parts are approaching a
stable state. We encourage trying it out and experimenting with Integreat, and
we highly appreciate feedback, but know that anything might change.

The basic idea of Integreat is to make it easy to define a set of data sources
and expose them through a well defined interface, to abstract away the specifics
of each source, and map their data to defined datatypes.

This is done through:
- adapters, that does all the hard work of communicating with the different
  sources
- a definition format, for setting up each source with the right adapter and
  parameters
- a `dispatch()` function that sends actions to the right adapters via internal
  action handlers

It is possible to set up Integreat to treat one source as a store/buffer for
other sources, and schedule syncs between the store and the other sources.

Finally, there will be different interface modules available, that will plug
into the `dispatch()` function and offer other ways of reaching data from the
sources – such as out of the box REST or GraphQL APSs.

```
            _________________
           |    Integreat    |
           |                 |
           |        |-> Adapter <-> Source
Action -> Dispatch -|        |
           |        |-> Adapter <-> Source
           |                 |
           |_________________|
```

Data from the sources is retrieved, normalized, and mapped by the adapter, and
returned asynchronously back to the code that initiated the action. Actions for
fetching data will be executed right away.

Actions that update data on sources will reversely map and serialize the data
before it is sent to a source. These actions may be queued or scheduled, by
setting up Integreat with the supplied queue middleware.

Integreat comes with a [standard data format](#the-data-format), which is the
only format that will be exposed to the code dispatching the actions. The
mapping, normalizing, and serializing will happing to and from this format,
according to the defined datatypes and mapping rules.

To deal with security and permissions, Integreat has a built-in concept of an
ident. Other authentication schemes may be mapped to Integreat's ident scheme,
to provide data security from a source to another source or to the dispatched
action. A ground principle is that nothing that enters Integreat from an
authenticated source, will leave Integreat unauthenticated. What this means,
though, depends on how you define your sources.

## Install
Requires node v8.6.

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
  ]
}]

const mappings = [
  {
    type: 'message',
    source: 'helloworld',
    attributes: {text: {path: 'message'}}
  }
]

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
associated with a source, which is used to retrieve data for the type, unless
another source is specified.

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
      default: <object>,
      query: <query params>
    }
  },
  auth: <auth def>
}
```

The convention is to use singular mode for the `id`. The `plural` property is
optional, but it's good practice to set it to the plural mode of the `id`, as
some interfaces may use it. For instance,
[`integreat-api-json`](https://github.com/integreat-io/integreat-api-json) uses
it to build a RESTful endpoint structure, and will append an _s_ to `id` if
`plural` is not set – which may be weird in some cases.

### Attributes
Each attribute is defined with an id, which may contain only alphanumeric
characters, and may not start with a digit. This id is used to reference the
attribute.

The `type` defaults to `string`. Other options are `integer`, `float`,
`boolean`, and `date`. Data from Integreat will be cast to corresponding
JavaScript types.

The `default` value will be used when a data source does not provide this value.
Default is `null`.

### Relationships
Relationship is defined in the same way as attributes, but with one important
difference: The `type` property refers to other Integreat datatypes. E.g. a
datatype for an article may have a relationship called `author`, with
`type: 'user'`, referring to the datatype with id `user`. `type` is required on
relationships.

The `default` property sets a default value for the relationship, in the same
way as for attributes, but note that this value should be a valid id for an item
of the type the relationship refers to.

Finally, relationships have a `query` property, which is used to retrieve items
for this relationship. In many cases, a source may not have data that maps to
id(s) for a relationship directly, and this is the typical use case for this
property.

The `query` property is an object with key/value pairs, where the key is the id
of a field (an attribute, a relationship, or `id`) on the datatype the relationship
refers to, and the value is the id of field on this datatype.

Example datatype with a query definition:
```
{
  id: 'user',
  ...
  relationships: {
    articles: {type: 'article', query: {author: 'id'}}
  }
}
```

In this case, the `articles` relationship on the `user` datatype may be fetched by
querying for all items of type `article`, where the `author` field equals the
`id` of the `user` item in question.

### Authorization

Set the `access` property to enforce permission checking on the datatype. This
applies to any source that provides this datatype.

The simplest access type `auth`, which means that anyone can do anything with
the data of this datatype, as long as they are authenticated.

Example of a datatype with an access rule:
```javascript
{
  id: 'entry',
  attributes: {...},
  relationships: {...},
  access: 'auth'
}
```

To signal that the datatype really has no need for authorization, use `all`.
This is not the same as not setting the `auth` prop, as `all` will override
Integreat's principle of not letting authorized data out of Integreat without
an authorization rule. In a way, you can say that `all` is an authorization
rule, but it allows anybody to access the data, even the unauthenticated.

The last of the simpler access types, is `none`, which will simly give no one
access, no matter who they are.

For a more fine-grained rules, set `access` to an access definition.

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
  meta: <type id>,
  baseUri: <uri>,
  endpoints: [
    <endpoint definition>,
    ...
  ],
  mappings: <array of map ids>
}
```

Source definitions are passed to Integreat on creation through the `integreat()`
function. To add sources after creation, pass a source definition to the
`great.setSource()` method. There is also a `great.removeSource()` method, that
accepts the id of a source to remove.

See [mapping definition](#mapping-definition) for a description of the
relationship between sources and mappings, and the `mappings` property.

The `auth` property should normally be set to the id of an
[auth definition](#source-authentication) if the source requires authentication.
In cases where the source is authenticated by other means, e.g. by including
username and password in the uri, set the `auth` property to `true` to signal
that this is an authenticated source.

### Endpoint definition
```
{
  id: <string>,
  type: <string>,
  scope: <'collection'|'member'>,
  action: <action type>,
  params: {...},
  options: {...}
}
```

#### Match properties
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

All match properties except `id` may be specified with an array of matching
values, so that an endpoint may match more cases. However, when two endpoints
match on a property specified as an array on one and as a single value on the
other, the one with the single value is picked.

When no match properties are set, the endpoint will match any requests, as long
as no other endpoints match.

#### Params property
An endpoint may accept properties, and indicate this by listing them on the
`params` object, with the value set to `true` for required params. All
properties are treated as strings.

An endpoint is only used for requests where all the required parameters are
present.

Example source definition with endpoint parameters:
```
{
  id: 'entries',
  adapter: 'json',
  endpoints: [
    {
      params: {
        author: true,
        archive: false
      },
      options: {
        uri: 'https://example.api.com/1.0/{author}/{type}_log{?archive}'
      }
    }
  ],
  ...
}
```

Some params are always available and does not need to be specified in `params`,
unless to define them as required:
- `id`: The item id from the request object or from the data property (if it is
  an object and not an array). Required in endpoints with `scope: 'member'`, not
  included for `scope: 'collection'`, and optional when scope is not set.
- `type`: The item type from the request object or from the data property (if it
  is an object and not an array).
- `typePlural`: The plural form of the type, gotten from the corresponding
  datatype's `plural` prop – or by adding an 's' to the type is `plural` is not
  set.

#### Options property
Unlike the match properties, the `options` property is required. This should be
an object with properties to be passed to the adapter as part of a request. The
props are completely adapter specific, so that each adapter can dictate what
kind of information it will need, but there are a set of recommended props to
use when they are relevant:

- `uri`: A uri template, where e.g. `{id}` will be placed with the value of the
parameter `id` from the request. For a full specification of the template
format, see
[Integreat URI Template](https://github.com/integreat-io/great-uri-template).

- `path`: A [path](#paths) into the data, specific for this endpoint. It will
usually point to an array, in which the items can be found, but as mappings may
have their own `path`, the endpoint path may point to an object from where the
different mapping paths point to different arrays.

- `method`: An adapter specific keyword, to tell the adapter which method of
transportation to use. For adapters based on http, the options will typically
be `PUT`, `POST`, etc. The method specified on the endpoint will override any
method provided elsewhere. As an example, the `SET` action will use the `PUT`
method as default, but only if no method is specified on the endpoint.

## Mapping definition
```
{
  id: <string>,
  type: <typeId|array>,
  source: <sourcId|array>
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
[required by Integreat]((#the-data-format)), so specify a [`path`](#paths) to
point to the right value for each attribute and relationship. These values will
be cast to the right datatype after all mapping, transforming, and formatting is
done. The value of each attribute or relationship should be in a format that can
be coerced to the type defined in the datatype. The `format` pipeline may be
used to accomplish this, but it is sufficient to return something that can be
cast to the right type. E.g. returning `'3'` for an integer is okay, as
Integreat will cast it with `parseInt()`.

The `param` property is an alternative to specifying a `path`, and refers to a
param passed to the `retreive` method. Instead of retrieving a value from the
source data, an attribute or relationship with `param` will get its value from
the corresponding parameter. When sending data _to_ a source, this
attribute/relationship will be disregarded.

Most of the time, your `attributes` and `relationships` definitions will only
have the `path` property, so providing the `path` string instead of an object
is a useful shorthand for this. I.e. `{title: 'article.headline'}` translates to
`{title: {path: 'article.headline'}}`.

Mappings does, by definition, relate to both sources and datatypes, as the thing
that binds them together. By stating which `type` and which `source` this
mapping is intended for, Integreat will connect the dots. In some cases you may
even be able to reuse a mapping for several sources or several types, in which
case you can specify an array of source ids on `source` or an array of types on
`type`.

Note that it is also possible to define on a source which mappings it will need.
The source will then reference the mapping `id`. You may combine these two ways
of connecting a source with mappings, but know that mappings defined by id on
the source will "win" if there's a conflict.

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

The bracket notation also offers two options for objects:
- `[keys]` - Matches all keys on an object
- `[values]` - Matches all values for the object's keys

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
If a source may send and receive metadata, set the `meta` property to the id of
a datatype defining the metadata as attributes.

```
{
  id: 'meta',
  source: <id of source handling the metadata>,
  attributes: {
    <metadataKey>: {
      type: <string>
    }
  }
}
```

The `source` property on the type defines the source that holds metadata for
this type. In some cases the source you're defining metadata for and the source
handling these metadata will be the same, but it is possible to let a source
handle other sources' metadata. If you're getting data from a read-only source,
but need to, for instance, set the `lastSyncedAt` metadata for this store,
you'll set up a source as a store for this (the store may also hold other types
of data). Then the read-only store will be defined with `meta='meta'`, and the
`meta` datatype will have `source='store'`.

It will usually make no sense to specify default values for metadata.

As with other data received and sent to sources, make sure to include endpoints
for the source that will hold the metadata, matching the `GET_META` and
`SET_META` actions, or the datatype defining the metadata. The way you set up
these endpoints will depend on your source.

Also define a [mapping](#mapping-definition) between this datatype and the
source. You may leave out `attributes` and `relationships` definitions and the
source will receive the metadata in Integreat's standard format:

```
{
  id: <sourceId>,
  type: <meta type>,
  createdAt: <date>,
  updatedAt: <date>,
  attributes: {
    <key>: <value>
  }
}
```

Finally, if a source will not have metadata, simply set `meta` to null or skip
it all together.

## Idents and security rules
An ident in Integreat is basically an id unique to one participant in the
security scheme. It is represented by an object, that may also have other
properties to describe the ident's permissions, or to make it possible to map
identities in other systems, to an Integreat ident.

Example ident:
```javascript
{
  id: 'ident1',
  tokens: ['facebook|12345', 'twitter|23456'],
  roles: ['admin']
}
```

The actual value of the `id` is irrelevant to Integreat, as long as it is a
string with A-Z, a-z, 0-9, \_, and -, and it's unique within one Integreat
configuration. This means that mapped value from sources may be used as ident
ids, but be careful to set this up right.

`tokens` are other values that may identify this ident. E.g., an api that uses
Twitter OAuth to identify it's users, may provide the `'twitter|23456'` token in
the example above, which will be replaced with this ident when it enters
Integreat.

`roles` are an example of how idents are given permissions. The roles are
custom defined per setup, and may be mapped to roles from other systems. When
setting the auth rules for a datasource, roles may be used to require that
the request to get data of this datatype, an ident with the role `admin` must
be provided.

Idents may be supplied with an action on the `meta.ident` property. It's up to
the code dispatching an action to get hold of the properties of an ident in a
secure way. Once Integreat receives an ident, it will assume this is accurate
information and uphold its part of the security agreement and only return data
and execute actions that the ident have permissions for.

### Access rules
Access rules are defined with properties telling Integreat which rights to
require when performing actions with a given datatype. It may be set across all
actions, or be specified per action.

An access definition for letting all authorized idents to GET, but requiring the
role `admin` to SET:

```javascript
{
  id: 'access1',
  actions: {
    GET: {allow: 'auth'},
    SET: {role: 'admin'}
  }
}
```

To use these access rules, set the definition object directly on the `access` property,
of an datatype, or set `access: 'access1'` on the relevant datatype(s). The `id`
is only needed in the latter case.

**Note:** Referring to access rules by id is not implemented yet.

For rules that treat every action the same, set the props on the access object
directly. This will also define a default for actions not defined specifically.

In the example above, no one will be allowed to DELETE. A better way to
achieve what we aimed for above, could be:

```javascript
{
  id: 'access2',
  role: 'admin',
  actions: {
    GET: {allow: 'auth'}
  }
}
```

In this example, all actions are allowed for admins, but anyone else that is
authenticated may GET.

Available rule props:
- `role` - Authorize only idents with this role. May be an array of strings
  (array is not implemented).
- `ident` - Authorize only idents with this precise id. May be an array (array
  is not implemented).
- `roleFromField` - Specify the field name (attribute or relationship) on
  the datatype, that will hold the role value. When authorizing a data item with
  an ident, the field value on the item must match a role on the ident.
- `identFromField` - The same as `roleFromField`, but for an ident id.
- `allow` - Set to `all`, `auth`, or `none`, to give access to everybody, only
  the authenticated, or no one at all. This is also available in short form –
  use this string instead of a access rule object.

Another example, intended for authorizing only the ident matching an account:
```javascript
{
  id: 'accountAccess',
  identFromField: 'id'
}
```

When used with e.g. an `account` datatype, given that the id of the account is
used as ident id, only an ident with the same id as the account, will have
access to it.

### Persisting idents
A security scheme with no way of storing the permissions given to each ident,
is of little value. (The only case where this would suffice, is when every
relevant source provided the same ident id, and authorization where done on the
ident id only.)

Unsurprisingly, Integreat uses datatypes and sources to store idents. In the
definition object passed to `integreat()`, set the id of the datatype to use
with idents, on `ident.datatype`.

In addition, you may define what fields (attributes or relationships) will
match the different props on an ident:

```javascript
{
  ...,
  ident: {
    type: 'account',
    props: {
      id: 'id',
      roles: 'groups',
      tokens: 'tokens'
    }
  }
}
```

When the prop and the field has the same name, it may be omitted, though it
doesn't hurt to specify it anyway – for clarity. The datasource still have the
final word, as any field that is not defined on the datatype, will not survive
casting.

Note that in the example above, the `id` of the data will be used as the ident
`id`. When the id is not suited for this, you will need another field on the
datatype that may act as the ident id. In cases where you need to transform the
id from the data in some way, this must be set up as a separate field and the
mapping definition will dictate how to transform it. In most cases, the `id`
will do, though.

The `source` specified on the datatype, will be where the ident are stored,
although that's not a precise way of putting it. The ident is never stored, but
a data item of the specified datatype is. The point is just that the ident
system will get the relevant data item and get the relevant fields from it. In
the same way, when storing an ident, a data item of the specified type is
updated with props from the ident – and then sent to the source.

For some setups, this requires certain endpoints to be defined on the source.
To match a token with an ident, the source must have an endpoint that matches
actions like this:

```javascript
{
  type: 'GET',
  payload: {
    type: 'account',
    params: {tokens: 'twitter|23456'}
  }
}
```

In this case, `account` is the datatype mapped to idents, and the `tokens`
property on the ident is mapped to the `tokens` field on the datatype.

To make Integreat complete idents on actions with the persisted data, set it up
with the `completeIdent` middleware:

```javascript
const great = integreat(defs, resources, [integreat.middleware.completeIdent])
```

This middleware will intercept any action with `meta.ident` and replace it with
the ident item loaded from the designated datatype. If the ident has an `id`,
the ident with this id is loaded, otherwise a `withToken` is used to load the
ident with the specified token. If no ident is found, the original ident is
kept.

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
  meta: <meta properties>
}
```

`type` is one [of the action types](#available-actions) that comes with
Integreat and `payload` are data for this action.

The `meta` object is for properties that does not belong in the payload. You may
add your own properties here, but be aware that some properties are already
used by Integreat, and more may be added in the future.

Current meta properties reserved by Integreat:
- `id`: Assigning the action an id. Will be picked up when queueing.
- `queue`: Signals that an action may be queued. May be `true` or a timestamp
- `queuedAt`: Timestamp for when the action was pushed to the queue
- `schedule`: A [schedule definition](#schedule-definition)
- `ident`: The ident to authorize the action with

### Returned responses from actions
Retrieving from a source will return an Intgreat response object of the
following format:

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

When the status is `queued`, the id of the queued action may found in
`response.data.id`. This is the id assigned by the queue, but it is expected
that queues will use `action.meta.id` when present.

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

By default, the returned data will be cast with default values, but set
`useDefaults: false` on the action payload to get only values mapped from the
source data.

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
Send data to a source. Returned in the `data` property is the data that was sent
to the source – casted, but not mapped to the source.

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

By default, only fields mapped from the action data will be sent to the source,
but set `useDefaults: true` to cast the data going to the source with default
values. This will also affect the data coming back from the action.

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

#### `DELETE` / `DEL`
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

`DEL` is a shorthand for `DELETE`.

#### `SYNC`
The `SYNC` action will retrieve items from one source and set them on another.
There are different options for how to retrieve items, ranging from a crude
retrieval of all items on every sync, to a more fine grained approach where only
items that have been updated since last sync, will be synced.

The simplest action definition would look like this, where all items would be
retrieved from the source and set on the target:
```
{
  type: 'SYNC',
  payload: {
    from: <sourceId>,
    to: <targetid>,
    type: <itemType>,
    retrieve: 'all'
  }
}
```

The action will dispatch a 'GET' action right away, and then immediately
dispatch a `SET_META` action to update the `lastSyncedAt` date on the source.
The actions to update the target is added to the queue.

To retrieve only new items, change the `retrieve` property to `updated`. In
this case, the action will get the `lastSyncedAt` from the `from` source, and
get only newer items, by passing it the `updatedAfter` param. The action will
also filter out older items, in case the source does not support `updatedAfter`.

Two other payload props might come in handy: The `paramsFrom` and `paramsTo`.
Each may be set to an object with params, that will be included in the action to
get from the `from` source and set to the `to` source, respectively. This allows
you to set params on these actions through the `SYNC` action.

#### `EXPIRE`
With an endpoint for getting expired items, the `EXPIRE` action will fetch
these and delete them from the source. The endpoint may include param for the
current time, either as microseconds since Januar 1, 1970 UTC with param
`{timestamp}` or as the current time in the extended ISO 8601 format
(`YYYY-MM-DDThh:mm:ss.sssZ`) with the `{isodate}` param. To get a time in the
future instead, set `msFromNow` to a positive number of milliseconds to add
to the current time, or set `msFromNow` to a negative number to a time in the
past.

Here's a typical action definition:
```
{
  type: 'EXPIRE',
  payload: {
    source: 'store',
    type: 'entry',
    endpoint: 'getExpired',
    msFromNow: 0
  }
}
```

This will get and map items of type `entry` from the `getExpired` endpoint on
the source `store`, and delete them from the same source. Only an endpoint
specified with an id is allowed, as the consequence of delete all items received
from the wrong endpoint could be quite severe.

Example endpoint uri template for `getExpired` (from a CouchDB source):
```javascript
{
  uri: '/_design/fns/_view/expired?include_docs=true{&endkey=timestamp}',
  path: 'rows[].doc'
}
```

### Custom actions

You may write your own action handlers to handle dispatched actions just like
the built-in types.

Action handler signature:
```javascript
function (payload, {dispatch, sources, datatypes, getSource}) { ... }
```

An action handler may dispatch new actions with the `dispatch()` method. These
will be passed through the middleware chain just like any other action, so it's
for instance possible to queue actions from an action handler by setting
`action.meta.queue = true`.

The `sources` and `datatypes` arguments provide all sources and datatypes set on
objects with their ids as keys.

Finally, `getSource()` is a convenience method that will return the relevant
source object when you provide it with a type. An optional second argument may
be set to a source id, in which case the source object with this id will be
returned.

Custom actions are supplied to an Integreat instance on setup, by providing an
object with the key set to the action type your handler will be responsible for,
and the handler function as the value.

```javascript
const actions = {
  `MYACTION`: function (payload, {dispatch}) { ... }
}
const great = integreat(defs, {datatypes, sources, mappings, actions})
```

Note that if a custom action handler is added with an action type that is
already use by one of Integreat's built-in action handlers, the custom handler
will have precedence. So be careful when you choose an action type, if your
intention is not to replace an existing action handler.

## Adapters
Interface:
- `prepareEndpoint(endpointOptions, [sourceOptions])`
- `async send(request)`
- `async normalize(data, request)`
- `async serialize(data, request)`

Available adapters:
- `json` (built in)
- [`couchdb`](https://github.com/integreat-io/integreat-adapter-couchdb)

## Source authentication
This definition format is used to authenticate with a source:
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

Built in formatters:
- `not` - inverts a boolean value going from or to a source
- `hash` - converts any string(ish) value to a SHA256 hash in base64 (with the
  url-unfriendly characters +, /, and = replaced with -, \_, and ~)

### Schedule definition
```
{
  schedule: <schedule>,
  action: <action definition>,
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

Example schedule running an action at 2 am every weekday:
```javascript
{
  schedule: {d: [2,3,4,5,6], h: [2]},
  action: {
    type: 'SYNC',
    payload: {
      from: 'src1',
      to: 'src2',
      type: 'entry'
    }
  }
}
```

To run an action every hour, use `{m: [0]}` or simply `'every hour'`.

## Writing middleware

You may write middleware to intercept dispatched actions. This may be useful
for logging, debugging, and features like action replay. Also, Integreat's
queue feature is written as a middleware.

A middleware is a function that accepts a `next()` function as only argument,
and returns an async function that will be called with the action on dispatch.
The returned function is expected to call `next()` with the action, and return
the result from the `next()` function, but is not required to do so. The only
requirement is that the functions returns a valid Integreat response object.

Example implementation of a very simple logger middleware:
```javascript
const logger = (next) => async (action) => {
  console.log('Dispatch was called with action', action)
  const response = await next(action)
  console.log('Dispatch completed with response', response)
  return response
}
```

## Queue

Integreat comes with a generic queue interface at `integreat.queue`, that must
be setup with a specific queue implementation, for instance
[`integreat-queue-redis`](https://github.com/integreat-io/integreat-queue-redis).

The queue interface is a middleware, that will intercept any dispatched action
with `action.meta.queue` set to `true` or a timestamp, and direct it to the
queue. When the action is later pulled from the queue, it will be dispatched
again, but without the `action.meta.queue` property.

If a dispatched action has a schedule definition at `action.meta.schedule`, it
will be queued for the next timestamp defined by the schedule.

To setup Integreat with a queue:

```javascript
const queue = integreat.queue(redisQueue(options))
const great = integreat(defs, resources, [queue.fromDispatch])
queue.setDispatch(great.dispatch)
```

`queue.fromDispatch` is the middleware, while `queue.setDispatch` must be called
to tell the queue interface where to dispatch actions pulled from the queue.

## Debugging
Run Integreat with env variable `DEBUG=great`, to receive debug messages.

Some sub modules sends debug messages with the `great:` prefix, so use
`DEBUG=great,great:*` to catch these as well.
