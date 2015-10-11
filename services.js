var fs = require('fs');
var devices = JSON.parse(fs.readFileSync('devices.json', 'utf8'));

console.log('devices ' + JSON.stringify(devices));

var parseString = require('xml2js').parseString;

var express = require('express')
  , bodyParser = require('body-parser')
  , xmlparser = require('express-xml-bodyparser');

function setupListeners (device) {
  var port = device.virtualPort;
  var app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(xmlparser());

  app.get('/setup.xml', function (req, res) {
    var xml  = new Buffer(
      '<?xml version="1.0"?><root>\r\n' +
      '<device>\r\n' +
      '<deviceType>urn:MakerMusings:device:controllee:1</deviceType>\r\n' +
      '<friendlyName>' + device.name + '</friendlyName>\r\n' +
      '<manufacturer>Belkin International Inc.</manufacturer>\r\n' +
      '<modelName>Emulated Socket</modelName>\r\n' +
      '<modelNumber>3.1415</modelNumber>\r\n' +
      '<UDN>uuid:Socket-1_0-' + device.serial + '</UDN>\r\n' +
      '</device>\r\n' +
      '</root>\r\n' +
      '\r\n'
    );

    res.status(200).send(xml);
  });

  app.post('/upnp/control/basicevent1', function (req, res) {
    console.log('body : ' + JSON.stringify(req.body['s:envelope']['s:body'][0]['u:setbinarystate'][0].binarystate));

    res.sendStatus(200);
  });

  app.listen(port, function() {
    console.log('Express server listening on port ' + port);
  });
}

for (var i = 0; i < devices.length; i++) {
  var device = devices[i];
  var port = device.address.port;
  console.log('device[' + i + '] ' + JSON.stringify(device));
  console.log('address: ' + device.address.address + ':' + device.address.port);

  setupListeners(device);
}
