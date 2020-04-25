import { Data } from '../../../../types'

export default function jsonTransform() {
  return (data: Data, { rev }: { rev: boolean }) =>
    rev ? JSON.stringify(data) : JSON.parse(data as string)
}
