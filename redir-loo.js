// Dependencies
var bodyParser = require('body-parser');
var CASAuthentication = require('cas-authentication');
var express = require('express');
var session = require('express-session');
var Client = require('mariasql');
var whiskers = require('whiskers');
var shortid = require('shortid');
var validUrl = require('valid-url');

// App config
var config = require('./config/config.json');
var casService = new CASAuthentication(config.casOptions);
var app = express();
app.use(session({
    secret: config.expressSessionSecret,
    resave: false,
    saveUninitialized: true
}));
app.engine('.html', whiskers.__express);
app.set('views', __dirname + '/templates');

// DB config
var client = new Client(config.sqlOptions);
var preparedUserLookup = client.prepare('SELECT * FROM USERS WHERE USERNAME=:username');
var preparedUserInsert = client.prepare('INSERT INTO USERS (username) VALUES (:username)');
var preparedUserDelete = client.prepare('DELETE FROM USERS WHERE USERNAME=:username LIMIT 1');
var preparedUserLinksLookup = client.prepare('SELECT url, shortened FROM users a, links b WHERE a.username=:username AND a.userid=b.owner');
var preparedUserLinksInsert = client.prepare('INSERT INTO links (url, shortened, owner) SELECT :link, :shortened, users.userid FROM users WHERE users.username=:username');
var preparedLinkLookup = client.prepare('SELECT url FROM links WHERE shortened=:shortened');

// Create link constants
ResponseCodes = {
    SUCCESS: 0,
    BAD_URL: 1,
    DATABASE_ERROR: 2
};

// Expose static resources
app.use(express.static('public'));

// Configure body parser for POST requests
var jsonParser = bodyParser.json({ strict: true, type: 'application/json' });

// Route GET requests as appropriate
app.get('/', function(request, response) {
    response.render('index.html', {
        partials: {
            head: 'head.html',
            header: 'header.html',
            footer: 'footer.html'
        },
        user: request.session[casService.session_name],
        title: 'Home'
    });
})

app.get('/login', casService.bounce, function(request, response) {
    client.query( preparedUserLookup ({ username: request.session[casService.session_name] }),
        function(error, rows) {
            if (error) {
                console.log(error);
            }
            else if (rows.length) {
                response.redirect('/my-links');
            }
            else {
                client.query( preparedUserInsert({ username: request.session[casService.session_name] }),
                    function (error, rows) {
                        if (error) {
                            console.log(error);
                        }
                        response.redirect('/my-links');
                    }
                );
            }
        }
    );
});

app.get('/my-links', casService.bounce, function(request, response) {
    client.query(
        preparedUserLinksLookup({ username: request.session[casService.session_name] }),
        function(error, rows) {
            if (error) {
                console.log(error);
            }
            else {
                response.render('user.html', {
                    partials: {
                        head: 'head.html',
                        header: 'header.html',
                        footer: 'footer.html'
                    },
                    user: request.session[casService.session_name],
                    rows: rows,
                    title: 'My Links'
                });
            }
        }
    );
});

app.get('/l/:id', casService.bounce, function(request, response) {
    var shortenedId = request.params.id;
    if (!shortid.isValid(shortenedId)) {
        response.status(404).send();
        return;
    }

    client.query(
        preparedLinkLookup({
            shortened: shortenedId
        }),
        function(error, rows) {
            if (error) {
                console.log(error);
            }
            else if (!rows.length) {
                response.status(404).send();
            }
            else {
                response.redirect(rows[0].url);
            }
        }
    );
});

app.get('/logout', casService.logout);

// Route POST requests as appropriate
app.post('/create-link', casService.block, jsonParser, function(request, response) {

    // requirements for valid POST request:
    // url is a well-formatted HTTP or HTTPS link

    var jsonResponse = {};

    if (!validUrl.isWebUri(request.body.url)) {
        jsonResponse.code = ResponseCodes.BAD_URL;
        response.send(JSON.stringify(jsonResponse));
        response.end();
        return;
    }

    var generatedId = shortid.generate();
    client.query(
        preparedUserLinksInsert({
            username: request.session[casService.session_name],
            link: request.body.url,
            shortened: generatedId }),
        function(error, rows) {
            if (error) {
                console.log(error);
                jsonResponse.code = ResponseCodes.DATABASE_ERROR;
                response.send(JSON.stringify(jsonResponse));
                response.end();
            }
            else {
                jsonResponse.code = ResponseCodes.SUCCESS;
                jsonResponse.shortened = generatedId;
                jsonResponse.url = request.body.url;
                response.send(JSON.stringify(jsonResponse));
                response.end();
            }
        }
    );
});

// Start the server
app.listen(80);
