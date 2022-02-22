import test from 'ava'

import stringify from './stringify'

// Setup

const xmlData =
  '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><GetPaymentMethodsResponse xmlns="http://example.com/webservices"><GetPaymentMethodsResult><PaymentMethod><Id>1</Id><Name>Cash</Name></PaymentMethod><PaymentMethod><Id>2</Id><Name>Invoice</Name></PaymentMethod></GetPaymentMethodsResult></GetPaymentMethodsResponse></soap:Body></soap:Envelope>'

const soapNamespaceOnParent = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><NaeringBrikkeListeResponse xmlns="http://internal.ws.no/webservices/"><NaeringBrikkeListeResult xmlns:a="http://schemas.datacontract.org/2004/07/Common"><a:Melding>Message</a:Melding><a:ReturKode>0</a:ReturKode><a:ReturVerdi>Value</a:ReturVerdi></NaeringBrikkeListeResult></NaeringBrikkeListeResponse></soap:Body></soap:Envelope>`

const soapNoNamespace = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><NaeringBrikkeListeResponse><NaeringBrikkeListeResult xmlns:a="http://schemas.datacontract.org/2004/07/Common"><a:Melding>Message</a:Melding><a:ReturKode>0</a:ReturKode><a:ReturVerdi>Value</a:ReturVerdi></NaeringBrikkeListeResult></NaeringBrikkeListeResponse></soap:Body></soap:Envelope>`

const namespaces = {
  'http://www.w3.org/2003/05/soap-envelope': 'soap',
  'http://example.com/webservices': '',
}

// Tests

test('should stringify object structure to xml', (t) => {
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
  const expected = xmlData

  const ret = stringify(data, namespaces)

  t.is(ret, expected)
})

test('should stringify object without $value objects', (t) => {
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        GetPaymentMethodsResponse: {
          GetPaymentMethodsResult: {
            PaymentMethod: [
              { Id: '1', Name: 'Cash' },
              { Id: '2', Name: 'Invoice' },
            ],
          },
        },
      },
    },
  }
  const expected = xmlData

  const ret = stringify(data, namespaces)

  t.is(ret, expected)
})

test('should stringify attributes', async (t) => {
  const data = {
    PaymentMethods: {
      PaymentMethod: [
        { '@Id': '1', '@Name': 'Cash' },
        { '@Id': '2', '@Name': 'Invoice' },
      ],
    },
  }
  const expected = `<?xml version="1.0" encoding="utf-8"?><PaymentMethods xmlns="http://example.com/webservices"><PaymentMethod Id="1" Name="Cash"/><PaymentMethod Id="2" Name="Invoice"/></PaymentMethods>`

  const ret = stringify(data, namespaces)

  t.is(ret, expected)
})

test('should stringify array with one object to xml', (t) => {
  const data = [
    {
      PaymentMethods: {
        PaymentMethod: [
          { Id: { $value: '1' }, Name: { $value: 'Cash' } },
          { Id: { $value: '2' }, Name: { $value: 'Invoice' } },
        ],
      },
    },
  ]
  const expected =
    '<?xml version="1.0" encoding="utf-8"?><PaymentMethods xmlns="http://example.com/webservices"><PaymentMethod><Id>1</Id><Name>Cash</Name></PaymentMethod><PaymentMethod><Id>2</Id><Name>Invoice</Name></PaymentMethod></PaymentMethods>'

  const ret = stringify(data, namespaces)

  t.is(ret, expected)
})

test('should stringify array of strings', (t) => {
  const data = {
    GetPaymentMethodsResponse: {
      GetPaymentMethodsResult: {
        PaymentMethod: ['Cash', 'Invoice'],
      },
    },
  }
  const expected =
    '<?xml version="1.0" encoding="utf-8"?><GetPaymentMethodsResponse xmlns="http://example.com/webservices"><GetPaymentMethodsResult><PaymentMethod>Cash</PaymentMethod><PaymentMethod>Invoice</PaymentMethod></GetPaymentMethodsResult></GetPaymentMethodsResponse>'

  const ret = stringify(data, namespaces)

  t.is(ret, expected)
})

test('should encode chars', async (t) => {
  const data = {
    Text: { $value: '<p>Text æøå; 💩λ @\n\'•\' & ÆØÅ "123"</p>' },
  }
  const expected = `<?xml version="1.0" encoding="utf-8"?><Text xmlns="http://example.com/webservices">&lt;p&gt;Text &#230;&#248;&#229;; &#128169;&#955; @\n&apos;&#8226;&apos; &amp; &#198;&#216;&#197; &quot;123&quot;&lt;/p&gt;</Text>`

  const ret = stringify(data, namespaces)

  t.is(ret, expected)
})

test('should stringify Date to iso string', (t) => {
  const data = {
    Stats: {
      Views: { $value: '134' },
      LastVisited: { $value: new Date('2021-03-18T11:43:44Z') },
    },
  }
  const expected =
    '<?xml version="1.0" encoding="utf-8"?><Stats xmlns="http://example.com/webservices"><Views>134</Views><LastVisited>2021-03-18T11:43:44.000Z</LastVisited></Stats>'

  const ret = stringify(data, namespaces)

  t.is(ret, expected)
})

test('should not include unused namespaces', async (t) => {
  const namespaces = {
    'http://example.com/webservices': '',
    'http://www.w3.org/2001/XMLSchema-instance': 'xsi',
    'http://www.w3.org/2001/XMLSchema': 'xsd',
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
  const expected = xmlData

  const ret = stringify(data, namespaces)

  t.is(ret, expected)
})

test('should handle different namespaces', async (t) => {
  const namespaces = {
    'http://travelcompany.example.org/reservation/travel/': 'p',
    'http://travelcompany.example.org/reservation/hotels/': 'q',
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        'p:itinerary': {
          'p:departure': {
            'p:departing': 'New York',
            'p:arriving': 'Los Angeles',
            'p:departureDate': '2001-12-14',
            'p:seatPreference': 'aisle',
          },
          'p:return': {
            'p:departing': 'Los Angeles',
            'p:arriving': 'New York',
            'p:departureDate': '2001-12-20',
            'p:seatPreference': null,
          },
        },
        'q:lodging': {
          'q:preference': 'none',
        },
      },
    },
  }
  const expected =
    '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><p:itinerary xmlns:p="http://travelcompany.example.org/reservation/travel/"><p:departure><p:departing>New York</p:departing><p:arriving>Los Angeles</p:arriving><p:departureDate>2001-12-14</p:departureDate><p:seatPreference>aisle</p:seatPreference></p:departure><p:return><p:departing>Los Angeles</p:departing><p:arriving>New York</p:arriving><p:departureDate>2001-12-20</p:departureDate><p:seatPreference xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/></p:return></p:itinerary><q:lodging xmlns:q="http://travelcompany.example.org/reservation/hotels/"><q:preference>none</q:preference></q:lodging></soap:Body></soap:Envelope>'

  const ret = stringify(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should use overriden xsi namespace', async (t) => {
  const namespaces = {
    'http://www.w3.org/2003/05/soap-envelope': 'soap',
    'http://example.com/webservices': '',
    'http://www.w3.org/2001/XMLSchema-instance': 'p3',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        empty: null,
      },
    },
  }
  const expected = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><empty p3:nil="true" xmlns="http://example.com/webservices" xmlns:p3="http://www.w3.org/2001/XMLSchema-instance"/></soap:Body></soap:Envelope>`

  const ret = stringify(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should set namespace on parent', async (t) => {
  const namespaces = {
    'http://internal.ws.no/webservices/': '',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
    'http://schemas.xmlsoap.org/soap/envelope/': 'soap',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        NaeringBrikkeListeResponse: {
          NaeringBrikkeListeResult: {
            'a:Melding': 'Message',
            'a:ReturKode': '0',
            'a:ReturVerdi': 'Value',
          },
        },
      },
    },
  }
  const expected = soapNamespaceOnParent

  const ret = stringify(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should not set no-namespace', async (t) => {
  const namespaces = {
    '': '',
    'http://schemas.datacontract.org/2004/07/Common': 'a',
    'http://schemas.xmlsoap.org/soap/envelope/': 'soap',
  }
  const data = {
    'soap:Envelope': {
      'soap:Body': {
        NaeringBrikkeListeResponse: {
          NaeringBrikkeListeResult: {
            'a:Melding': 'Message',
            'a:ReturKode': '0',
            'a:ReturVerdi': 'Value',
          },
        },
      },
    },
  }
  const expected = soapNoNamespace

  const ret = stringify(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should return undefined when not an object', (t) => {
  t.is(stringify('Hello', namespaces), undefined)
  t.is(stringify(32, namespaces), undefined)
  t.is(stringify(true, namespaces), undefined)
  t.is(stringify(new Date(), namespaces), undefined)
  t.is(stringify(null, namespaces), undefined)
  t.is(stringify(undefined, namespaces), undefined)
})
