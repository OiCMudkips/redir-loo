// Dependencies
var bodyParser = require('body-parser');
var CASAuthentication = require('cas-authentication');
var express = require('express');
var session = require('express-session');
var Client = require('mariasql');
var whiskers = require('whiskers');

// App config
var config = require('./config/config.json');
var casService = new CASAuthentication(config.casOptions);
var app = express();
app.use(session({
    secret: config.expressSessionSecret,
    resave: false,
    saveUninitialized: true
}));
app.engine('.whisker', whiskers.__express);
app.set('views', __dirname + '/templates');

// DB config
var client = new Client(config.sqlOptions);
var preparedUserLookup = client.prepare('SELECT * FROM USERS WHERE USERNAME=:username');
var preparedUserInsert = client.prepare('INSERT INTO USERS (username) VALUES (:username)');
var preparedUserDelete = client.prepare('DELETE FROM USERS WHERE USERNAME=:username LIMIT 1');
var preparedLinkLookup = client.prepare('SELECT url, shortened FROM links WHERE id IN (SELECT b.linkid FROM users a, linkowners b WHERE a.username=:username AND a.userid=b.userid)');

// Expose static resources
app.use(express.static('public'));

// Configure body parser for POST requests
app.use(bodyParser.json({ strict: true, type: 'application/json' }));

// Route GET requests as appropriate
app.get('/', function(request, response) {
    response.render('index.whisker', { user: request.session[casService.session_name] });
})

app.get('/login', casService.bounce, function(request, response) {
    client.query( preparedUserInsert({ username: request.session[casService.session_name] }),
        function(error, rows) {
            if (error && error.code === 1062) {
                console.log('Existing user ' + request.session[casService.session_name] + ' logged in.');
                response.redirect('/my-links');
            }
            else if (error) {
                console.log(error);
            }
            else {
                console.log('New user ' + request.session[casService.session_name] + ' logged in.');
                response.redirect('/my-links');
            }
        }
    );
});

app.get('/my-links', casService.bounce, function(request, response) {
    client.query( preparedLinkLookup({ username: request.session[casService.session_name] }),
        function(error, rows) {
            if (error) {
                console.log(error);
            }
            else {
                response.render('user.whisker',
                                { user: request.session[casService.session_name],
                                  rows: rows });
            }
        }
    );
});

app.get('/logout', casService.logout);

// Route POST requests as appropriate
app.post('/create-link', casService.block, function(request, response) {
    var destinationUrl = request.body.destinationUrl;
    console.log('Destination URL:' + destinationUrl);
    // TODO: send back something to make a popup saying it worked
    response.send('Thanks!');
    response.end();
});

// Start the server
app.listen(4004);
