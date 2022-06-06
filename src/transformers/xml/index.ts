import { CustomFunction } from 'map-transform'
import parse from './parse'
import stringify from './stringify'

export type Namespaces = Record<string, string>

export type ElementValue = Element | Element[] | null

export interface ObjectElement<T = ElementValue> {
  [key: string]: T | string
}

export interface TextElement extends ObjectElement {
  $value: string
}

export type Element = ObjectElement | TextElement

export interface Operands {
  namespaces?: Namespaces
}

const xml: CustomFunction =
  ({ namespaces }: Operands, _options) =>
  (data, state) =>
    state.rev ? stringify(data, namespaces) : parse(data, namespaces)

export default xml
