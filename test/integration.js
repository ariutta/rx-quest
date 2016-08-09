var requests = require('./browser/superagent-get-chunked-worker.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
//var mockserverMocha  =  require('../../helpers/mockserver-mocha.js');
var Rx = require('rx-extra');
var RxNode = Rx.RxNode;
var RxFs = require('rx-fs');
var sinon      = require('sinon');
var testUtils = require('./helpers/test-utils.js');
var wd = require('wd');

var requests = require('../index.js');

var handleResult = testUtils.handleResult;

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('superagent-get-chunked', function() {
  var suite = this;
  suite.allPassed = true;

  //mockserverMocha();

  var inputs = [{
    accept: 'text/tab-separated-values',
    url: 'http://webservice.bridgedb.org/Human/xrefs/L/4292',
    fontSize: '5px',
    parser: {
      type: 'text/tab-separated-values',
      options: {
        headers: ['identifier', 'db'],
        skipEmptyLines: true
      }
    }
  }, {
    accept: 'text/tab-separated-values',
    url: 'http://webservice.bridgedb.org/Human/xrefs/L/4292',
    fontSize: '5px',
  }, {
    // large file!
    accept: 'tsv',
    url: [
      'https://cdn.rawgit.com/nrnb/mirna-pathway-finder/master/',
      'wp-mir-table-builder/mir-gene-targets.txt'
    ].join(''),
    fontSize: '5px',
    parser: {
      type: 'text/tab-separated-values',
      options: {
        headers: true,
        skipEmptyLines: true
      }
    }
  }, {
    // large file!
    accept: 'json',
    url: 'https://cdn.rawgit.com/dominictarr/JSONStream/master/test/fixtures/all_npm.json',
    fontSize: '8px',
    parser: {
      type: 'application/json',
      options: ['rows.*'],
    },
  }, {
    accept: 'json',
    url: 'https://publicdata-weather.firebaseio.com/sanfrancisco/.json',
    fontSize: '8px',
  }, {
    accept: 'ndjson',
    url: 'https://cdn.rawgit.com/maxogden/sqlite-search/master/test.ndjson',
    fontSize: '4px',
  }, {
    url: 'https://cdn.rawgit.com/simeonackermann/VocTo/master/data/example.n3',
    fontSize: '12px',
    parser: {
      // for this content type, a noop parser is used, so the raw result is returned unparsed.
      type: 'application/octet-stream',
    },
  }, {
    accept: 'n3',
    url: 'https://cdn.rawgit.com/simeonackermann/VocTo/master/data/example.n3',
    fontSize: '12px',
  }, {
    // large file!
    accept: 'n3',
    url: 'https://cdn.rawgit.com/ruby-rdf/rdf-n3/develop/example-files/sp2b.n3',
    fontSize: '5px',
  }, {
    accept: 'xml',
    url: [
      'https://cdn.rawgit.com/wikipathways/pvjs/master/',
      'test/input-data/troublesome-pathways/WP1243_69897.gpml'
    ].join(''),
    fontSize: '10px',
  }, {
    accept: 'xml',
    url: 'https://cdn.rawgit.com/jmandel/sample_ccdas/master/HL7%20Samples/CCD.sample.xml',
    fontSize: '10px',
  }];

  before(function(done) {
    done();
  });

  beforeEach(function(done) {
    suite.allPassed = suite.allPassed && (this.currentTest.state === 'passed');
    done();
  });

  afterEach(function(done) {
    suite.allPassed = suite.allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    done();
  });

  it('should get and parse tsv', function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + '/webservice_bridgedb_org_Human_xrefs_L_4292.json';

    var selectedInput = inputs[0];

    var requestInstance = requests(selectedInput.url, {
      headers: {
        Accept: selectedInput.accept,
      },
      streaming: true,
      parser: selectedInput.parser
    });

    RxNode.fromUnpauseableStream(requestInstance)
    .toArray()
    .let(handleResult.bind(testCoordinator))
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

});
