# superagent-chunked

Adds support to the superagent library for chunked-transfer encoded responses when in the browser.

Install and run with:

```
git clone https://github.com/ariutta/superagent-chunked.git
cd superagent-chunked
npm install
npm start
```

## TODO
For XML parser, use one that allows for querying the stream, like one of these:
* JSONStream-ish: https://www.npmjs.com/package/xml-objects with [JSONStream](https://www.npmjs.com/package/JSONStream)
* tag name only: https://www.npmjs.com/package/xml-objects with https://www.npmjs.com/package/xml-nodes
* JSONStream-ish queries: https://www.npmjs.com/package/xmlstream2
* xpath: https://www.npmjs.com/package/xml-object-stream-sax
* xpath: https://www.npmjs.com/package/xml-slicer (no tests)
* tag name only: https://www.npmjs.com/package/halfstreamxml

This claims to be faster than sax-js
https://www.npmjs.com/package/saxophone

This is interesting but reads in everything:
https://www.npmjs.com/package/xml-flow-cdata

This is by far the most popular XML parsing library in npm:
https://www.npmjs.com/package/xml2js
and there's an interesting library that builds on top of it, allowing to query the resulting JSON by xpath:
https://www.npmjs.com/package/xml2js-xpath
