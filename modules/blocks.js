var async = require("async");
var Router = require('../helpers/router.js');

var modules, library, self, privated = {}, shared = {};
var genesisblock = null;
privated.loaded = false;
privated.isActive = false;

function Blocks(scope, cb) {
    library = scope;
    genesisblock = library.genesisblock;
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
        "post /mine": "mine",
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

privated.saveBlock = function (block, cb) {
    library.logic.block.dbSave(block, function (err) {
        if (err) {
            library.logger.error('block dbSave', err);
            cb(err);
        }

        async.eachSeries(block.transactions, function (transaction, cb) {
            transaction.blockId = block.id;
            library.logic.transaction.dbSave(transaction, cb);
        }, function (err) {
            if (err) {
                library.logger.error('transaction dbSave', err);
            }
            cb(err);
        });
    });
};

Blocks.prototype.onBind = function (scope) {
    modules = scope;

    privated.loaded = true;
};

Blocks.prototype.cleanup = function (cb) {
    privated.loaded = false;
    if (!privated.isActive) {
        cb();
    } else {
        setImmediate(function nextWatch() {
            if (privated.isActive) {
                setTimeout(nextWatch, 1 * 1000);
            } else {
                cb();
            }
        });
    }
};

Blocks.prototype.lastBlock = function () {
    return shared.getBlocks(null, function (err, res) {
        if (err) {
            return cb(err);
        }
        return res.blocks.slice(-1)[0];

    });
};

shared.getBlocks = function (req, cb) {
    if (!privated.loaded) {
        cb("Blockchain is loading");
    }

    library.dbLite.query('SELECT * FROM blocks ORDER BY height ASC', null, ['id', 'timestamp', 'proof', 'previousHash', 'height'], function (err, rows) {
        if (err) {
            library.logger.error(err);
            return cb(err);
        }

        var data = {
            blocks: rows,
            count: rows.length
        };

        cb(null, data);
    });
};

shared.mine = function (req, cb) {
    if (!privated.loaded) {
        cb("Blockchain is loading");
    }
    modules.peers.getPeers(function (err, peers) {
        console.log(peers)
    });
    cb(null, 11)
    // library.dbLite.query('SELECT * FROM blocks', null, ['id', 'timestamp', 'proof', 'previousHash', 'height'], function (err, rows) {
    //     if (err) {
    //         library.logger.error(err);
    //         return cb(err);
    //     }
    //
    //     var data = {
    //         blocks: rows,
    //         count: rows.length
    //     };
    //
    //     cb(null, data);
    // });
};

module.exports = Blocks;
