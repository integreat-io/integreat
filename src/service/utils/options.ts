/* eslint-disable security/detect-object-injection */
import deepClone from '../../utils/deepClone.js'
import type {
  ServiceOptions,
  PreparedOptions,
  TransporterOptions,
} from '../types.js'

export function prepareOptions({
  transporter: { incoming, ...transporter } = {},
  incoming: incomingBase,
  adapters,
  ...topLevel
}: ServiceOptions): PreparedOptions {
  // Combine transporter options with top-level options
  const transporterOptions = {
    ...topLevel,
    ...transporter,
    ...(incoming || incomingBase
      ? { incoming: { ...incomingBase, ...incoming } }
      : {}),
  }

  return adapters
    ? { transporter: transporterOptions, adapters }
    : { transporter: transporterOptions }
}

const removeIncoming = ({ incoming, ...options }: TransporterOptions) => options

export function mergeOptions(a: PreparedOptions, b: PreparedOptions) {
  const transporterOptions = deepClone({
    ...removeIncoming(a.transporter),
    ...removeIncoming(b.transporter),
  })
  if (a.transporter.incoming || b.transporter.incoming) {
    transporterOptions.incoming = deepClone({
      ...a.transporter.incoming,
      ...b.transporter.incoming,
    })
  }

  const adaptersA = a.adapters || {}
  const adaptersB = b.adapters || {}
  const adapterIds = [
    ...Object.keys(adaptersA),
    ...Object.keys(adaptersB),
  ].filter((id, index, ids) => !ids.slice(0, index).includes(id))

  if (adapterIds.length === 0) {
    return { transporter: transporterOptions }
  }

  const adapterOptions = Object.fromEntries(
    adapterIds.map((id) => [
      id,
      deepClone({ ...adaptersA[id], ...adaptersB[id] }),
    ])
  )

  return { transporter: transporterOptions, adapters: adapterOptions }
}
