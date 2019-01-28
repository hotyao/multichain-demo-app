'use strict';
var express = require('express');
var serve_static = require('serve-static');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var async = require('async');
var fs = require('fs');
var os = require('os');
var io = require('socket.io')(http);
var winston = require('winston');

var logger = new (winston.Logger)({
    level: 'debug',
    transports: [
        new (winston.transports.Console)({ colorize: true }),
    ]
});

var host = 'localhost';
var port = 3003;

var cfenv = require('cfenv');
const appEnv = cfenv.getAppEnv();

var multichain_options = {
    "api_key": "dtkrcvZVoVRkbVQBkRGyENGkWsDX3amGTCyKnZvp4cLkebx9DGsUrs3bPQnhEM4J",
    "url": "https://maas-proxy.cfapps.eu10.hana.ondemand.com/2775fef0-f977-4672-aa99-7a3a013c3512/rpc"         
};
multichain_options = appEnv.getServiceCreds(process.env.multichainServiceName) || multichain_options;
var multichain = require(__dirname + '/multichain.js')(multichain_options, logger);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/assets.html', function (req, res) {
    res.sendFile(__dirname + '/assets.html');
});

app.use(serve_static(path.join(__dirname, 'public')));
var server = http.listen(process.env.PORT || port, function () {
    console.log('[index.js] Server Up - ' + host + ':' + port);         
});

io.on('connection', function (socket) {
    logger.info('[socket-io] connected');                  
    socket.on('message', function (message) {
        var options = {};
        var data = JSON.parse(message);
        if (data.action === 'init') {
            socket.emit('message', JSON.stringify({
                action: 'finished-loading',
                origin: data.action,
                successfull: true
            })); 
        }            
        else if (data.action === 'write') {
                data.asset_value = parseInt(data.asset_value) + "";
                logger.info('[socket-io] try to write: ' + data.asset_value);
                options.args = {
                    asset_id: 'SAP000S407W212743',
                    asset_value: data.asset_value
                };
                multichain.write(options, function (err) {    
                    if(!err) {
                        logger.info('[socket-io] write: SAP000S407W212743 OK');                         
                        socket.emit('message', JSON.stringify({
                            action: 'finished',
                            origin: data.action,
                            successfull: true
                        }));                         
                    }                         
                    else {
                        socket.emit('message', JSON.stringify({
                            action: 'finished',
                            message: err,                        
                            origin: data.action,
                            successfull: false
                        }));  
                    }                              
                });
        }     
        else if (data.action === 'read') {
            options.args = {
                asset_id: 'SAP000S407W212743'
            };
            multichain.read(options, function (err, lengthNum, xValue, yValue) {
                if(!err) {
                    logger.info('[socket-io] read all: SAP000S407W212743 OK');                         
                    socket.emit('message', JSON.stringify({
                        action: 'read-finished',
                        origin: data.action,
                        successfull: true,
                        length: lengthNum,
                        asset_time: xValue,
                        asset_value: yValue

                    }));                         
                }                        
                else {
                    socket.emit('message', JSON.stringify({
                        action: 'read-finished',
                        message: err,                        
                        origin: data.action,
                        successfull: false
                    }));  
                }                              
            });
        } 

    });
    socket.on('disconnect', function () {
        logger.info('[socket-io] disconnected');
    });
});