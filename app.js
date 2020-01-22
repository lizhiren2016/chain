'use strict';

var program = require('commander');
var async = require('async');
var packageJson = require('./package.json');
var appConfig = require('./config.json');
var Logger = require('./logger.js');
var index = require('./routes/index');
var genesisBlock = require('./genesisBlock');

process.stdin.resume();

// Get enviroment in the .env
require('dotenv').config();

// 引入命令行选项,config默认值通常允许用户修改
program
    .version(packageJson.version)
    .option('-p, --port <port>', 'Listening port number')
    .parse(process.argv);

if (program.port) {
    appConfig.port = program.port;
}

var config = {
    "db": program.blockchain || "./blockchain.db",
    "modules": {
        "blocks": "./modules/blocks.js",
        "transactions": "./modules/transactions.js",
        "peers": "./modules/peers.js",
    }
};

// 初始化logger
var logger = new Logger({echo: appConfig.consoleLogLevel, errorLevel: appConfig.fileLogLevel});

// 使用uncaughtException捕捉进程异常
process.on('uncaughtException', function (err) {
    // handle the error safely
    logger.fatal('System error', {message: err.message, stack: err.stack});
    process.emit('cleanup');
});

var d = require('domain').create();
d.on('error', function (err) {
    logger.fatal('Domain master', {message: err.message, stack: err.stack});
    process.exit(0);
});

d.run(function () {
    var modules = [];
    async.auto({
        config: function (cb) {
            cb(null, appConfig);
        },

        logger: function (cb) {
            cb(null, logger);
        },

        genesisblock: function (cb) {
            cb(null, {
                block: genesisBlock
            });
        },

        network: ['config', function (scope, cb) {
            var express = require('express');

            var app = express();
            var server = require('http').createServer(app);

            cb(null, {
                express: express,
                app: app,
                server: server
            });
        }],

        connect: ['config', 'logger', 'network', 'genesisblock', function (scope, cb) {
            var bodyParser = require('body-parser');

            scope.network.app.use(bodyParser.json());

            scope.network.server.listen(scope.config.port, scope.config.address, function (err) {
                scope.logger.log("started: " + scope.config.address + ":" + scope.config.port);

                if (!err) {
                    cb(null, scope.network);
                } else {
                    cb(err, scope.network);
                }
            });

        }],

        bus: function (cb) {
            var changeCase = require('change-case');
            var bus = function () {
                this.message = function () {
                    var args = [];
                    Array.prototype.push.apply(args, arguments);
                    var topic = args.shift();
                    modules.forEach(function (module) {
                        var eventName = 'on' + changeCase.pascalCase(topic);
                        if (typeof (module[eventName]) == 'function') {
                            module[eventName].apply(module[eventName], args);
                        }
                    })
                }
            }
            cb(null, new bus)
        },

        dbLite: function (cb) {
            var dbLite = require('./helpers/dbLite.js');
            dbLite.connect(config.db, function (err, db) {
                cb(null, db);
            });
        },

        logic: ['dbLite', 'bus', 'genesisblock', function (scope, cb) {
            var Transaction = require('./logic/transaction.js');
            var Block = require('./logic/block.js');
            var Peer = require('./logic/peer.js');

            async.auto({
                bus: function (cb) {
                    cb(null, scope.bus);
                },
                dbLite: function (cb) {
                    cb(null, scope.dbLite);
                },
                genesisblock: function (cb) {
                    cb(null, {
                        block: genesisBlock
                    });
                },
                transaction: ["dbLite", "bus", 'genesisblock', function (scope, cb) {
                    new Transaction(scope, cb);
                }],
                block: ["dbLite", "bus", 'genesisblock', 'transaction', function (scope, cb) {
                    new Block(scope, cb);
                }],
                peer: ["dbLite", "bus", 'genesisblock', 'transaction', 'block', function (scope, cb) {
                    new Peer(scope, cb);
                }]
            }, cb);
        }],

        modules: ['network', 'connect', 'config', 'logger', 'bus', 'dbLite', function (scope, cb) {
            var tasks = {};
            Object.keys(config.modules).forEach(function (name) {
                tasks[name] = function (cb) {
                    var d = require('domain').create();

                    d.on('error', function (err) {
                        scope.logger.fatal('Domain ' + name, {message: err.message, stack: err.stack});
                    });

                    d.run(function () {
                        logger.debug('Loading module', name)
                        var Klass = require(config.modules[name]);
                        var obj = new Klass(scope, cb);
                        modules.push(obj);
                    });
                }
            });

            async.parallel(tasks, function (err, results) {
                cb(err, results);
            });
        }],
        ready: ['modules', 'bus', function (scope, cb) {
            scope.bus.message("bind", scope.modules);
            cb();
        }]
    }, function (err, scope) {
        if (err) {
            logger.fatal(err)
        } else {
            scope.logger.info("Modules ready and launched");

            process.once('cleanup', function () {
                scope.logger.info("Cleaning up...");
                async.eachSeries(modules, function (module, cb) {
                    if (typeof (module.cleanup) == 'function') {
                        module.cleanup(cb);
                    } else {
                        setImmediate(cb);
                    }
                }, function (err) {
                    if (err) {
                        scope.logger.error(err);
                    } else {
                        scope.logger.info("Cleaned up successfully");
                    }
                    process.exit(1);
                });
            });

            process.once('SIGTERM', function () {
                process.emit('cleanup');
            })

            process.once('exit', function () {
                process.emit('cleanup');
            });

            process.once('SIGINT', function () {
                process.emit('cleanup');
            });
        }
    });
});
