let request = require('request');
let assert = require('assert');
let server = require('../server.js');

var base_url = 'http://localhost:3000/';

describe('Server Test', function () {

	after(function() {
		server.closeServer();
	});

	describe('GET /', function() {
		it('should return status code 200', function() {
			request.get(base_url, function(error, response, body) {
				assert.equal(200, response.statusCode);
				done();
			});
		});
	});

});
