// Dependencies
var bodyParser = require('body-parser');
var CASAuthentication = require('cas-authentication');
var express = require('express');
var session = require('express-session');

// Config
var config = require('./config/config.json');
var casService = new CASAuthentication(config.casOptions);
var app = express();
app.use(session({
    secret: config.expressSessionSecret,
    resave: false,
    saveUninitialized: true
}));

// Expose static resources
app.use(express.static('public'));

// Configure body parser for POST requests
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ strict: true, type: 'application/json' }));

// Route GET requests as appropriate
app.get('/login', casService.bounce, function(request, response) {
    response.redirect('/user');
});

app.get('/user', casService.bounce, function(request, response) {
    response.json(request.session[casService.session_name]);
});

app.get('/logout', casService.logout, function(request, response) {
    response.send('Logged out!');
});

// Route POST requests as appropriate
app.post('/create-link', casService.block, function(request, response) {
    var destinationUrl = request.body.destinationUrl;
    console.log('Destination URL:' + destinationUrl);
    // TODO: send back something to make a popup saying it worked
    response.send('Thanks!');
    response.end();
});

// Start the server
app.listen(4004, function() {
    console.log('I am now listening on port 4004!');
});
