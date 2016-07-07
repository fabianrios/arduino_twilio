var serialport = require('serialport');// include the serial port library
   SerialPort = serialport.SerialPort; // make a local instance of it
   portName = process.argv[2];
var path = require('path');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var twilio = require('twilio');
var config = require("../config");

// Create a Twilio REST API client for authenticated requests to Twilio
var client = twilio(config.accountSid, config.authToken);


var myPort = new SerialPort(portName, {
   baudRate: 9600,
   // look for return and newline at the end of each data packet:
   parser: serialport.parsers.readline("\n")
 });
 


// Configure application routes
module.exports = function(app) {
    // serial stuff
    myPort.on('open', showPortOpen);
    myPort.on('data', sendSerialData);
    myPort.on('close', showPortClose);
    myPort.on('error', showError);

    function showPortOpen() {
       console.log('port open. Data rate: ' + myPort.options.baudRate);
    }

    function sendSerialData(data) {
       console.log("data:", data);
       if (data == 430){
         var url = 'https://boiling-gorge-96626.herokuapp.com/outbound';
         client.makeCall({
             to: '+4915170367787',
             from: config.twilioNumber,
             url: url
         }, function(err, message) {
             console.log(err);
             if (err) {
                 console.log(err)
             } else {
                 console.log('Thank you! We will be calling you shortly.');
             }
         });
       }
    }

    function showPortClose() {
       console.log('port closed.');
    }

    function showError(error) {
       console.log('Serial port error: ' + error);
    }
    
    // Set Jade as the default template engine
    app.set('view engine', 'jade');

    // Express static file middleware - serves up JS, CSS, and images from the
    // "public" directory where we started our webapp process
    app.use(express.static(path.join(process.cwd(), 'public')));

    // Parse incoming request bodies as form-encoded
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    // Use morgan for HTTP request logging
    app.use(morgan('combined'));

    // Home Page with Click to Call 
    app.get('/', function(request, response) {
        response.render('index');
    });

    // Handle an AJAX POST request to place an outbound call
    app.post('/call', function(request, response) {
        // This should be the publicly accessible URL for your application
        // Here, we just use the host for the application making the request,
        // but you can hard code it or use something different if need be
        console.log("request.headers.host", request.headers.host);
        var url = 'https://boiling-gorge-96626.herokuapp.com/outbound';
        
        // Place an outbound call to the user, using the TwiML instructions
        // from the /outbound route
        client.makeCall({
            to: request.body.phoneNumber,
            from: config.twilioNumber,
            url: url
        }, function(err, message) {
            console.log(err);
            if (err) {
                response.status(500).send(err);
            } else {
                response.send({
                    message: 'Thank you! We will be calling you shortly.'
                });
            }
        });
    });

    // Return TwiML instuctions for the outbound call
    app.post('/outbound', function(request, response) {
        // We could use twilio.TwimlResponse, but Jade works too - here's how
        // we would render a TwiML (XML) response using Jade
        response.type('text/xml');
        response.render('outbound');
    });
};


