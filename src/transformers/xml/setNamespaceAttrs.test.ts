import test from 'ava'

import setNamespaceAttrs from './setNamespaceAttrs'

// Tests

test('should set namespace on first occurence of prefix', (t) => {
  const namespaces = {
    'http://example.com/webservices': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        GetPaymentMethodsResponse: {
          GetPaymentMethodsResult: {
            PaymentMethod: [
              { Id: { $value: '1' }, Name: { $value: 'Cash' } },
              { Id: { $value: '2' }, Name: { $value: 'Invoice' } },
            ],
          },
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        GetPaymentMethodsResponse: {
          '@xmlns': 'http://example.com/webservices',
          GetPaymentMethodsResult: {
            PaymentMethod: [
              { Id: { $value: '1' }, Name: { $value: 'Cash' } },
              { Id: { $value: '2' }, Name: { $value: 'Invoice' } },
            ],
          },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should declare namespace on leaf', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        CardNew: {},
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        CardNew: {
          '@xmlns': 'http://example.com/webservices/',
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should declare namespace on first parent of several occurences of prefix', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        CardNew: {
          'a:customerkey': { $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11' },
          'a:rfid': { $value: '04793182CB4884' },
          installationid: { $value: '138' },
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        CardNew: {
          '@xmlns': 'http://example.com/webservices/',
          '@xmlns:a': 'http://schemas.datacontract.org/2004/07/Common',
          'a:customerkey': { $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11' },
          'a:rfid': { $value: '04793182CB4884' },
          installationid: { $value: '138' },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should declare namespace on first parent of occurences of prefix on different levels', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        CardNew: {
          Customer: {
            'a:customerkey': { $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11' },
            'a:customername': { $value: 'Rolf' },
          },
          'a:rfid': { $value: '04793182CB4884' },
          installationid: { $value: '138' },
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        CardNew: {
          '@xmlns': 'http://example.com/webservices/',
          '@xmlns:a': 'http://schemas.datacontract.org/2004/07/Common',
          Customer: {
            'a:customerkey': { $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11' },
            'a:customername': { $value: 'Rolf' },
          },
          'a:rfid': { $value: '04793182CB4884' },
          installationid: { $value: '138' },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should declare namespace on first parent of occurences including attributes', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        CardNew: {
          '@a:rfid': '04793182CB4884',
          Customer: {
            'a:customerkey': { $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11' },
            'a:customername': { $value: 'Rolf' },
          },
          installationid: { $value: '138' },
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        CardNew: {
          '@xmlns': 'http://example.com/webservices/',
          '@xmlns:a': 'http://schemas.datacontract.org/2004/07/Common',
          '@a:rfid': '04793182CB4884',
          Customer: {
            'a:customerkey': { $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11' },
            'a:customername': { $value: 'Rolf' },
          },
          installationid: { $value: '138' },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should set namespace on element without children', (t) => {
  const namespaces = {
    'http://example.com/webservices': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        GetPaymentMethodsResponse: {},
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        GetPaymentMethodsResponse: {
          '@xmlns': 'http://example.com/webservices',
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should not include undefined values', (t) => {
  const namespaces = {
    'http://example.com/webservices': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        GetPaymentMethodsResponse: {
          GetPaymentMethodsResult: {
            PaymentMethod: { Id: { $value: '1' }, Name: undefined },
          },
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        GetPaymentMethodsResponse: {
          '@xmlns': 'http://example.com/webservices',
          GetPaymentMethodsResult: {
            PaymentMethod: { Id: { $value: '1' } },
          },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should set nil attribute on null', (t) => {
  const namespaces = {
    'http://example.com/webservices': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        GetPaymentMethodsResponse: {
          GetPaymentMethodsResult: {
            PaymentMethod: [
              { Id: { $value: '1' }, Name: null },
              { Id: { $value: '2' }, Name: null },
            ],
          },
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        GetPaymentMethodsResponse: {
          '@xmlns': 'http://example.com/webservices',
          GetPaymentMethodsResult: {
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            PaymentMethod: [
              { Id: { $value: '1' }, Name: { '@xsi:nil': 'true' } },
              { Id: { $value: '2' }, Name: { '@xsi:nil': 'true' } },
            ],
          },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should use provided xsi prefix', (t) => {
  const namespaces = {
    'http://example.com/webservices': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://www.w3.org/2001/XMLSchema-instance': 'i',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        GetPaymentMethodsResponse: {
          GetPaymentMethodsResult: {
            PaymentMethod: null,
          },
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        GetPaymentMethodsResponse: {
          '@xmlns': 'http://example.com/webservices',
          GetPaymentMethodsResult: {
            PaymentMethod: {
              '@i:nil': 'true',
              '@xmlns:i': 'http://www.w3.org/2001/XMLSchema-instance',
            },
          },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should set namespace on null element', (t) => {
  const namespaces = {
    'http://example.com/webservices': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        empty: null,
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        empty: {
          '@xmlns': 'http://example.com/webservices',
          '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          '@xsi:nil': 'true',
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should handle value without $value', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        CardNew: {
          'a:installationid': '138',
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        CardNew: {
          '@xmlns': 'http://example.com/webservices/',
          'a:installationid': {
            '@xmlns:a': 'http://schemas.datacontract.org/2004/07/Common',
            $value: '138',
          },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should handle attributes with $value', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        CardNew: {
          '@a:external': { $value: 'true' },
          $value: '138',
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        CardNew: {
          '@xmlns': 'http://example.com/webservices/',
          '@xmlns:a': 'http://schemas.datacontract.org/2004/07/Common',
          '@a:external': 'true',
          $value: '138',
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should convert values to string', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
  }
  const data = {
    Values: {
      Number: 38,
      Boolean: { $value: true },
      Date: new Date('2021-01-03T18:44:11Z'),
      '@Attr': false,
    },
  }
  const expected = {
    Values: {
      '@xmlns': 'http://example.com/webservices/',
      Number: { $value: '38' },
      Boolean: { $value: 'true' },
      Date: { $value: '2021-01-03T18:44:11.000Z' },
      '@Attr': 'false',
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should declare namespace on first parent of attribute', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        CardNew: {
          '@a:rfid': '04793182CB4884',
          installationid: { $value: '138' },
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        CardNew: {
          '@xmlns': 'http://example.com/webservices/',
          '@xmlns:a': 'http://schemas.datacontract.org/2004/07/Common',
          '@a:rfid': '04793182CB4884',
          installationid: { $value: '138' },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should declare namespace on first parent of occurences of prefix in array', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        CardNew: {
          Customer: [
            {
              'a:customerkey': {
                $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11',
              },
              'a:customername': { $value: 'Rolf' },
            },
            {
              'a:customerkey': {
                $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B12',
              },
              'a:customername': { $value: 'Inger' },
            },
          ],
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        CardNew: {
          '@xmlns': 'http://example.com/webservices/',
          '@xmlns:a': 'http://schemas.datacontract.org/2004/07/Common',
          Customer: [
            {
              'a:customerkey': {
                $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11',
              },
              'a:customername': { $value: 'Rolf' },
            },
            {
              'a:customerkey': {
                $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B12',
              },
              'a:customername': { $value: 'Inger' },
            },
          ],
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should declare namespace on element in array when its the only item', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        CardNew: {
          Customer: [
            {
              'a:customerkey': {
                $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11',
              },
              'a:customername': { $value: 'Rolf' },
            },
          ],
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        CardNew: {
          '@xmlns': 'http://example.com/webservices/',
          Customer: {
            '@xmlns:a': 'http://schemas.datacontract.org/2004/07/Common',
            'a:customerkey': {
              $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11',
            },
            'a:customername': { $value: 'Rolf' },
          },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should not include $value when looking for namespaces', (t) => {
  const namespaces = {
    'http://example.com/webservices/': '',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        'a:CardNew': {
          Customer: {
            'a:customerkey': { $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11' },
          },
          'a:rfid': { $value: '04793182CB4884' },
        },
      },
    },
  }
  const expected = {
    'soap:Envelope': {
      '@xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'soap:Body': {
        'a:CardNew': {
          '@xmlns:a': 'http://schemas.datacontract.org/2004/07/Common',
          Customer: {
            '@xmlns': 'http://example.com/webservices/',
            'a:customerkey': { $value: 'AD0B2E69-4640-FBF4-9CC7-0C713FDF3B11' },
          },
          'a:rfid': { $value: '04793182CB4884' },
        },
      },
    },
  }

  const ret = setNamespaceAttrs(data, namespaces)

  t.deepEqual(ret, expected)
})
