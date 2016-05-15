var express = require('express');
var session = require('express-session');
var CASAuthentication = require('cas-authentication');

var config = require('./config/config.json');

/* CAS Setup */
var casService = new CASAuthentication(config.casOptions);

/* Express Setup */
var app = express();

app.use(session({
    secret: config.expressSessionSecret,
    resave: false,
    saveUninitialized: true
}));

app.use(express.static('public'));

app.get('/login', casService.bounce, function(request, response) {
    response.send('Successfully authenticated!');
});

app.get('/user', casService.bounce, function(request, response) {
    response.json(request.session[casService.session_name]);
});

app.get('/logout', casService.logout, function(request, response) {
    response.send('Logged out!');
});

app.listen(4004, function() {
    console.log('I am now listening on port 4004!');
});
