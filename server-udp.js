var PORT = 1900;
var NETWORK_PATTERN = '192\.168\.0\..*'; // We only mind this network...

var os = require('os');

var interfaces = os.networkInterfaces();
var addresses = [];
for (var i in interfaces) {
    //console.log('interface : ' + JSON.stringify(interfaces[i]));
    for (var j in interfaces[i]) {
        var address = interfaces[i][j];
        //console.log('address : ' + JSON.stringify(address));
        if (address.family === 'IPv4' && !address.internal) {
            if (address.address.match(NETWORK_PATTERN)) {
              addresses.push(address.address);
            }
        }
    }
}
console.log(addresses);
if (addresses.length <= 0) {
  console.log('No interface is up! Go start some!');
  process.exit(1);
}

var dgram = require("dgram");

var fs = require('fs');
var devices = JSON.parse(fs.readFileSync('devices.json', 'utf8'));

console.log('devices ' + JSON.stringify(devices));

/*var devices = [
  {
      serial : 'VW0001',
      name : 'Heating',
      address : {
        address : '192.168.0.207',
        port : '3001'
      }
  },
  {
      serial : 'VW0002',
      name : 'Sitting room lights',
      address : {
        address : '192.168.0.207',
        port : '3002'
      }
  }];*/

function sendMessage(socket, port, address, callback) {
  var promises = [];

  for (var i = 0; i < devices.length; i++) {
    var device = devices[i];
    console.log('Device: ' + JSON.stringify(device));
    var promise = new Promise(
        // The resolver function is called with the ability to resolve or
        // reject the promise
        function(resolve, reject) {
          // described at bit.ly/1zjVJVW
          var query = new Buffer(
            'HTTP/1.1 200 OK\r\n' +
            'CACHE-CONTROL: max-age=86400\r\n' +
            'DATE: Mon, 22 Jun 2015 17:24:01 GMT\r\n' +
            'EXT:\r\n' +
            'LOCATION: http://' + addresses[0] + ':' + device.virtualPort + '/setup.xml' + '\r\n' +
            'OPT: "http://schemas.upnp.org/upnp/1/0/"; ns=01\r\n' +
            '01-NLS: 905bfa3c-1dd2-11b2-8928-fd8aebaf491c\r\n' +
            'SERVER: Unspecified, UPnP/1.0, Unspecified\r\n' +
            'X-User-Agent: redsonic\r\n' +
            'ST: urn:Belkin:device:**\r\n' +
            'USN: uuid:Socket-1_0-' + device.serial + '::urn:Belkin:device:**\r\n' +
            '\r\n'
          );

            //console.log('promise-constructor ' + device.serial + ' Promise started (Async code started)');

            // Send query on each socket
            //serials.push(device.serial);
            socket.send(query, 0, query.length, port, address, function (err, bytes) {
                if (err) {
                  reject('Error: ' + err);
                } else {
                  resolve(device.serial)
                }
            });
        });

    promises.push(promise);
  }

  console.log('About to send ' + promises.length + ' messages' );

  Promise.all(promises)
    .then(function (serials) {
        serials.forEach(function (serial) {
            //console.log('serial : ' + serial);
        });
        callback(null, serials);
    })
    .catch(function (reason) {
        // Receives first rejection among the promises
        console.log('Error sending messages ' + reason);
        callback(reason, serials);
    });
}

var server = dgram.createSocket("udp4");

server.on("error", function (err) {
  console.log("server error:\n" + err.stack);
  server.close();
});

server.on("message", function (msg, rinfo) {
  console.log("server got: " + msg + " from " + rinfo.address + ":" + rinfo.port);

  var socket = dgram.createSocket('udp4');

  socket.on('listening', function () {
    var address = socket.address();
    console.log(">>> socket ready " +  address.address + ":" + address.port);

    sendMessage(socket, rinfo.port, rinfo.address, function(reason, serials){
      if (reason) {
        console.log('Error sending messages to : ' + rinfo.address + ":" + rinfo.port + ' reason => ' + reason);
      } else {
        console.log('>>> messages sent to : ' + rinfo.address + ":" + rinfo.port + ' serials: ' + serials);
      }
      socket.close();
    });
  });

  console.log('>>> binding to 0.0.0.0' +  ':' + '0');
  socket.bind(0, '0.0.0.0');
});

server.on("listening", function () {
  var address = server.address();
  console.log("server listening " +  address.address + ":" + address.port);
  //server.setMulticastTTL(128);
  //server.addMembership('239.255.255.250', HOST);
});

server.bind(PORT, function () {
  //server.setMulticastTTL(128);
  server.addMembership('239.255.255.250');
});
