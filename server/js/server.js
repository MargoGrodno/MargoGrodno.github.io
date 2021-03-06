var http = require('http');
var util = require('util');
var assert = require('assert');
var url = require('url');
var getIp = require('./getIp');
var historyMod = require('./history');

var startTime = curentDateTime();
var history = new historyMod.History();
var toBeResponded = [];

var ip = getIp();

var handlerMap = {
    "GET": getHandler,
    "OPTIONS": optionsHandler,
    "DELETE": deleteHandler,
    "POST": postHandler,
    "PUT": putHandler
};

var errStatusMap = {
    "Deleting non-existent message": 422,
    "Rollback non-existent message": 422,
    "Edit non-existent message": 422,
    "Nothing for rollback": 422,
    "Unsuported operation": 400,
    "Wrong token format": 422,
    "Wrong token": 422,
    "Unsuported http request": 501,
    "Bad Request": 400
}

var server = http.createServer(function(req, res) {
    console.log('method: ' + req.method + ", " + req.url);

    var handler = handlerMap[req.method];
    if (handler == undefined) {
        responseWith(res, Error("Unsuported http request"));
    }

    handlerMap[req.method](req, res, function(err) {
        responseWith(res, err);
    });
});

function responseWith(response, body) {
    if (body instanceof Error) {
        responseWithError(response, body);
        return;
    }

    var statusCode = 200;
    response.writeHeader(statusCode, {
        'Access-Control-Allow-Origin': '*'
    });
    if (body) {
        response.write(JSON.stringify(body));
    }
    response.end();
}

function responseWithError(response, err) {
    var statusCode = errStatusMap[err.message];
    if (statusCode == undefined) {
        statusCode = 400;
    }

    response.writeHeader(statusCode, {
        'Access-Control-Allow-Origin': '*'
    });
    response.write(JSON.stringify(err.message));
    response.end();
}

function getHandler(req, res, continueWith) {
    var urlToken = getUrlToken(req.url);

    if (req.url == "/") {
        continueWith({
            status: "Running",
            startTime: startTime,
            curentToken: history.getToken()
        });
        return;
    }

    if (urlToken == undefined) {
        continueWith(Error("Bad Request"));
        return;
    }

    history.getMessages(urlToken, function(answer, error) {
        if (error !== undefined) {
            continueWith(error);
            return;
        }
        if (answer !== undefined) {
            var body = {
                token: history.getToken(),
                messages: answer
            };
            continueWith(body);
            return;
        }
        remaineWait(req, res, continueWith);
    });
}

function postHandler(req, res, continueWith) {
    awaitBody(req, function(message) {
        history.addMessage(message, function(err) {
            if (err) {
                continueWith(err);
            } else {
                respondAll();
                continueWith();
            }
        });
    });
}

function optionsHandler(req, res, continueWith) {
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    continueWith();
}

function putHandler(req, res, continueWith) {
    awaitBody(req, function(message) {
        history.editMessage(message, function(err) {
            if (err) {
                continueWith(err);
            } else {
                respondAll();
                continueWith();
            }
        });
    });
}

function deleteHandler(req, res, continueWith) {
    awaitBody(req, function(message) {
        history.deleteMessage(message, function(err) {
            if (err) {
                continueWith(err);
            } else {
                respondAll();
                continueWith();
            }
        });
    });
}

function remaineWait(req, res, continueWith) {
    toBeResponded.push({
        request: req,
        response: res,
        continueWith: continueWith
    });
}

function respondAll() {
    toBeResponded.forEach(function(waiter) {
        getHandler(waiter.request, waiter.response, waiter.continueWith);
    });
    toBeResponded = [];
}

function awaitBody(req, handler) {
    var reqBody = '';
    req.on('data', function(data) {
        reqBody += data.toString();
    });

    req.on('end', function() {
        handler(JSON.parse(reqBody));
    });
}

function getUrlToken(u) {
    var parts = url.parse(u, true);
    return parts.query.token;
}

function curentDateTime() {
    var currentdate = new Date();
    var datetime = currentdate.getDate() + "/" +
        (currentdate.getMonth() + 1) + "/" +
        currentdate.getFullYear() + " @ " +
        currentdate.getHours() + ":" +
        currentdate.getMinutes() + ":" +
        currentdate.getSeconds();
    return datetime;
}

function startServer(port) {
    server.listen(port, ip);
    server.setTimeout(0);
    console.log('Server running at http://' + ip + ':' + port);
}

module.exports = {
    startServer: startServer
};
