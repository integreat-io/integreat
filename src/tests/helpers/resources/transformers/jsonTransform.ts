import { Data } from '../../../../types'

export default function jsonTransform() {
  return (data: Data, { rev }: { rev: boolean }) =>
    rev
      ? JSON.stringify(data)
      : typeof data === 'string'
      ? JSON.parse(data)
      : data
}
