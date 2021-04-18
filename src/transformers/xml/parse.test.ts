import test from 'ava'
import { ObjectElement } from '.'

import parse from './parse'

// Setup

const multiNameSpaceSoap = `<?xml version='1.0' ?>
<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope">
  <env:Header>
    <m:reservation xmlns:m="http://travelcompany.example.org/reservation"
            env:role="http://www.w3.org/2003/05/soap-envelope/role/next"
              env:mustUnderstand="true">
      <m:reference>uuid:093a2da1-q345-739r-ba5d-pqff98fe8j7d</m:reference>
      <m:dateAndTime>2001-11-29T13:20:00.000-05:00</m:dateAndTime>
    </m:reservation>
    <my-emp:passenger xmlns:my-emp="http://mycompany.example.com/employees"
            env:role="http://www.w3.org/2003/05/soap-envelope/role/next"
              env:mustUnderstand="true">
      <my-emp:name>John Fjon</my-emp:name>
    </my-emp:passenger>
  </env:Header>
  <env:Body>
    <p:itinerary
      xmlns:p="http://travelcompany.example.org/reservation/travel">
      <p:departure>
        <p:departing>New York</p:departing>
        <p:arriving>Los Angeles</p:arriving>
        <p:departureDate>2001-12-14</p:departureDate>
        <p:seatPreference>aisle</p:seatPreference>
      </p:departure>
      <p:return>
        <p:departing>Los Angeles</p:departing>
        <p:arriving>New York</p:arriving>
        <p:departureDate>2001-12-20</p:departureDate>
        <p:seatPreference/>
      </p:return>
    </p:itinerary>
    <q:lodging
      xmlns:q="http://travelcompany.example.org/reservation/hotels">
      <q:preference>none</q:preference>
    </q:lodging>
  </env:Body>
</env:Envelope>`

// Tests

test('should return object from xml string', (t) => {
  const data = `<?xml version="1.0" encoding="utf-8"?>
<GetPaymentMethodsResponse xmlns="http://example.com/webservices">
  <GetPaymentMethodsResult>
    <PaymentMethod>
      <Id>1</Id>
      <Name>Cash</Name>
    </PaymentMethod>
    <PaymentMethod>
      <Id>2</Id>
      <Name>Invoice</Name>
    </PaymentMethod>
  </GetPaymentMethodsResult>
</GetPaymentMethodsResponse>`
  const expected = {
    GetPaymentMethodsResponse: {
      GetPaymentMethodsResult: {
        PaymentMethod: [
          { Id: { $value: '1' }, Name: { $value: 'Cash' } },
          { Id: { $value: '2' }, Name: { $value: 'Invoice' } },
        ],
      },
    },
  }

  const ret = parse(data)

  t.deepEqual(ret, expected)
})

test('should handle several elements in body', (t) => {
  const data = `<?xml version="1.0" encoding="utf-8"?>
  <Body xmlns="http://example.com/webservices">
    <Element>1</Element>
    <Element>2</Element>
  </Body>`
  const expected = {
    Body: {
      Element: [{ $value: '1' }, { $value: '2' }],
    },
  }

  const ret = parse(data)

  t.deepEqual(ret, expected)
})

test('should decode chars', (t) => {
  const data = `<?xml version="1.0" encoding="utf-8"?>
<Content xmlns="http://example.com/webservices">
  <Text>&lt;p&gt;Text &#230;&#248;&#229;; 💩λ @\n&#39;•&#39; &amp; &#198;&#216;&#197; &quot;123&quot;&lt;/p&gt;</Text>
</Content>`
  const expected = {
    Content: {
      Text: { $value: '<p>Text æøå; 💩λ @\n\'•\' & ÆØÅ "123"</p>' },
    },
  }

  const ret = parse(data)

  t.deepEqual(ret, expected)
})

test('should convert attributes', (t) => {
  const data = `<?xml version="1.0" encoding="utf-8"?>
<GetPaymentMethodsResponse xmlns="http://example.com/webservices">
  <GetPaymentMethodsResult>
    <PaymentMethod Id="1" Name="Cash"/>
    <PaymentMethod Id="2">Invoice</PaymentMethod>
  </GetPaymentMethodsResult>
</GetPaymentMethodsResponse>`
  const expected: ObjectElement = {
    GetPaymentMethodsResponse: {
      GetPaymentMethodsResult: {
        PaymentMethod: [
          { '@Id': '1', '@Name': 'Cash' },
          { '@Id': '2', $value: 'Invoice' },
        ],
      },
    },
  }

  const ret = parse(data)

  t.deepEqual(ret, expected)
})

test('should return xsi:nil as null', (t) => {
  const data = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <soap:Body>
      <GetInvoicesResponse xmlns="http://api1.test/webservices">
        <GetInvoicesResult>
          <InvoiceOrder>
            <InvoiceId>341101</InvoiceId>
            <CustomerId>18003</CustomerId>
            <CustomerName>Client Inc</CustomerName>
            <OrderStatus>Invoiced</OrderStatus>
            <IncludeVAT xsi:nil="true" />
            <SendToFactoring xsi:nil="true"></SendToFactoring>
          </InvoiceOrder>
          <InvoiceOrder>
            <InvoiceId>341102</InvoiceId>
            <CustomerId>18003</CustomerId>
            <CustomerName>Client Inc</CustomerName>
            <OrderStatus>ForInvoicing</OrderStatus>
            <IncludeVAT/>
            <SendToFactoring></SendToFactoring>
          </InvoiceOrder>
        </GetInvoicesResult>
      </GetInvoicesResponse>
    </soap:Body>
  </soap:Envelope>`

  const ret = parse(data)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = (ret as any)['soap:Envelope']['soap:Body'].GetInvoicesResponse
    .GetInvoicesResult.InvoiceOrder
  t.is(orders[0].IncludeVAT, null)
  t.is(orders[0].SendToFactoring, null)
  t.deepEqual(orders[1].IncludeVAT, { $value: '' })
  t.deepEqual(orders[1].SendToFactoring, { $value: '' })
})

test('should return nil as null with custom xsi namescape', (t) => {
  const data = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
    <soap:Body>
      <GetInvoicesResponse xmlns="http://api1.test/webservices">
        <GetInvoicesResult>
          <InvoiceOrder>
            <InvoiceId>341101</InvoiceId>
            <IncludeVAT i:nil="true" />
          </InvoiceOrder>
        </GetInvoicesResult>
      </GetInvoicesResponse>
    </soap:Body>
  </soap:Envelope>`

  const ret = parse(data)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = (ret as any)['soap:Envelope']['soap:Body'].GetInvoicesResponse
    .GetInvoicesResult.InvoiceOrder
  t.is(orders.IncludeVAT, null)
  t.deepEqual(orders.IncludeVAT, null)
})

test('should always use soap prefix for soap 1.2', (t) => {
  const data = `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <Content xmlns="http://example.com/webservices">
      <Text>The text</Text>
    </Content>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`
  const expected = {
    'soap:Envelope': {
      'soap:Body': {
        Content: {
          Text: { $value: 'The text' },
        },
      },
    },
  }

  const ret = parse(data)

  t.deepEqual(ret, expected)
})

test('should always use soap prefix for soap 1.1', (t) => {
  const data = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <Content xmlns="http://example.com/webservices">
      <Text>The text</Text>
    </Content>
  </s:Body>
</s:Envelope>`
  const expected = {
    'soap:Envelope': {
      'soap:Body': {
        Content: {
          Text: { $value: 'The text' },
        },
      },
    },
  }

  const ret = parse(data)

  t.deepEqual(ret, expected)
})

test('should handle different namespaces', (t) => {
  const data = multiNameSpaceSoap
  const expected = {
    'soap:Envelope': {
      'soap:Header': {
        'm:reservation': {
          '@soap:role': 'http://www.w3.org/2003/05/soap-envelope/role/next',
          '@soap:mustUnderstand': 'true',
          'm:reference': {
            $value: 'uuid:093a2da1-q345-739r-ba5d-pqff98fe8j7d',
          },
          'm:dateAndTime': { $value: '2001-11-29T13:20:00.000-05:00' },
        },
        'my-emp:passenger': {
          '@soap:role': 'http://www.w3.org/2003/05/soap-envelope/role/next',
          '@soap:mustUnderstand': 'true',
          'my-emp:name': { $value: 'John Fjon' },
        },
      },
      'soap:Body': {
        'p:itinerary': {
          'p:departure': {
            'p:departing': { $value: 'New York' },
            'p:arriving': { $value: 'Los Angeles' },
            'p:departureDate': { $value: '2001-12-14' },
            'p:seatPreference': { $value: 'aisle' },
          },
          'p:return': {
            'p:departing': { $value: 'Los Angeles' },
            'p:arriving': { $value: 'New York' },
            'p:departureDate': { $value: '2001-12-20' },
            'p:seatPreference': { $value: '' },
          },
        },
        'q:lodging': {
          'q:preference': { $value: 'none' },
        },
      },
    },
  }

  const ret = parse(data)

  t.deepEqual(ret, expected)
})

test('should use given namespace prefixes', (t) => {
  const namespaces = {
    'http://example.com/webservices': 'yo',
    'http://api1.test/webservices': '',
  }
  const data = `<?xml version="1.0" encoding="utf-8"?>
  <GetPaymentMethodsResponse xmlns="http://example.com/webservices">
    <GetPaymentMethodsResult status="done">
      <ns:PaymentMethod xmlns:ns="http://api1.test/webservices" ns:scope="all">
        <ns:Id>1</ns:Id>
        <ns:Name>Cash</ns:Name>
      </ns:PaymentMethod>
    </GetPaymentMethodsResult>
  </GetPaymentMethodsResponse>`
  const expected = {
    'yo:GetPaymentMethodsResponse': {
      'yo:GetPaymentMethodsResult': {
        '@yo:status': 'done',
        PaymentMethod: {
          '@scope': 'all',
          Id: { $value: '1' },
          Name: { $value: 'Cash' },
        },
      },
    },
  }

  const ret = parse(data, namespaces)

  t.deepEqual(ret, expected)
})

test('should return undefined when not an xml document', (t) => {
  const data = 'upps'

  const ret = parse(data)

  t.is(ret, undefined)
})
