// Dependencies
var express = require('express');
var session = require('express-session');
var CASAuthentication = require('cas-authentication');

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

// Route requests as appropriate
app.get('/login', casService.bounce, function(request, response) {
    response.redirect('/user');
});

app.get('/user', casService.bounce, function(request, response) {
    response.json(request.session[casService.session_name]);
});

app.get('/logout', casService.logout, function(request, response) {
    response.send('Logged out!');
});

// Start the server
app.listen(4004, function() {
    console.log('I am now listening on port 4004!');
});
