const BlockChain = require('../src/BlockChain/lib/BlockChain');
const {validationResult} = require('express-validator');
var WebSocket = require("ws");
var Router = require('../helpers/router.js');

var modules, library, self, privated = {}, shared = {};

function Blocks(scope, cb) {
    library = scope;
    self = this;
    self.__private = privated;
    privated.attachApi();
    privated.saveGenesisBlock(function (err) {
        setImmediate(cb, err, self);
    });
}

// private methods
privated.attachApi = function () {
    var router = new Router();

    router.use(function (req, res, next) {
        if (modules) return next();
        res.status(500).send({success: false, error: "Blockchain is loading"});
    });

    router.map(shared, {
        "get /": "getBlocks",
    });

    router.use(function (req, res, next) {
        res.status(500).send({success: false, error: "API endpoint not found"});
    });

    library.network.app.use('/api/blocks', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err) return next();
        library.logger.error(req.url, err.toString());
        res.status(500).send({success: false, error: err.toString()});
    });
};

privated.saveGenesisBlock = function (cb) {
    library.dbLite.query("SELECT id FROM blocks WHERE id=$id", {id: genesisblock.block.id}, ['id'], function (err, rows) {
        if (err) {
            return cb(err);
        }
        var blockId = rows.length && rows[0].id;

        if (!blockId) {
            privated.saveBlock(genesisblock.block, function (err) {
                if (err) {
                    library.logger.error('saveBlock', err);
                }

                return cb(err);
            });
        } else {
            return cb();
        }
    });
};

shared.getBlocks = function (req, cb) {
    if (!privated.loaded) {
        cb("Blockchain is loading");
    }
    var query = req.body;
    library.dbLite.query('SELECT ', function (err, rows) {
        if (err) {
            library.logger.error(err);
            return cb(err);
        }

        var blocks = [];
        for (var i = 0; i < rows.length; i++) {
            blocks.push(library.logic.block.dbRead(rows[i]));
        }

        var data = {
            blocks: blocks,
            count: count
        };

        cb(null, data);
    });
};

module.exports = Blocks;
