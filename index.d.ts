export as namespace integreat
export = integreat

declare function integreat (
  defs: integreat.Definitions,
  resources: integreat.Resources,
  middlewares?: integreat.Middleware[]
): integreat.Instance

declare namespace integreat {
  const resources: () => Resources
  const adapters: () => any
  const middleware: any
  const action: (type: string, payload: object, meta: object) => Action<Payload>
  const queue: (config: object) => Queue
  const mergeResources: (...resources: Partial<Resources>[]) => Resources

  export interface Payload {
    [key: string]: any
  }

  export interface Ident {
    id?: string,
    root?: boolean
  }

  export interface Meta {
    queue?: boolean,
    ident?: Ident,
    [key: string]: any
  }

  export interface Action<P = Payload> {
    type: string,
    payload: P,
    meta?: Meta
  }

  export type ActionHandlerResources = {
    dispatch: Dispatch
  }

  export interface Instance {
    version: string,
    schemas: object,
    services: object,
    identType: string,

    dispatch: Dispatch,
    on: (eventName: string, serviceId: string, listener: (request: Request, response: Response) => void) => void
  }

  export interface IdentDefinitions {
    type: string
    props?: {
      id?: string,
      roles?: string,
      tokens?: string
    }
  }

  export interface Definitions {
    schemas: object[],
    services: object[],
    mappings: object[],
    auths?: object[],
    ident?: IdentDefinitions
  }

  export interface Resources {
    adapters: any,
    authenticators?: any,
    transformers?: any,
    filters?: any,
    actions?: any
  }

  export interface Queue {
    queue: object,
    setDispatch: (dispatch: Dispatch) => Promise<void>,
    middleware: (next: Middleware) => Response,
    schedule: (schedule: object) => Response
  }

  export interface Dispatch {
    (action: Action<Payload>): Promise<Response>
  }

  export interface Middleware {
    (next: (value: any) => any): any
  }

  export type DataProperty = string | number | boolean | Date | null

  interface Attributes {
    [key: string]: DataProperty | DataProperty[] | null | undefined
  }

  type Relationship = {
    id: string | null | undefined,
    type: string,
    attributes?: Attributes,
    relationships?: Relationships,
    meta?: object
  }

  interface Relationships {
    [key: string]: Relationship | Relationship[] | null | undefined
  }

  export type Data = {
    id: string | null | undefined,
    type: string,
    attributes: Attributes,
    relationships: Relationships
  }

  interface Request<T = Data[] | Data | null> {
    action: string,
    params?: {
      [param: string]: any
    },
    endpoint?: {
      [option: string]: any
    }
    data: T,
    auth?: object | boolean,
    access?: { ident: Ident }
  }

  interface Response<T = Data[]> {
    status: string,
    data?: T,
    error?: string,
    responses?: Response[],
    access?: object
  }
}
