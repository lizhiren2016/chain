var Router = require('../helpers/router.js');

// privated fields
var modules, library, self, privated = {}, shared = {};
var genesisblock = null;

// Constructor
function Transactions(scope, cb) {
    library = scope;
    genesisblock = library.genesisblock;
    self = this;
    self.__private = privated;
    privated.attachApi();
    self.transactions = [];
    setImmediate(cb, null, self);
}

// private methods
privated.attachApi = function () {
    var router = new Router();

    router.use(function (req, res, next) {
        if (modules) return next();
        res.status(500).send({success: false, error: "Blockchain is loading"});
    });

    router.map(shared, {
        "post /new": "newTransaction",
    });

    router.use(function (req, res, next) {
        res.status(500).send({success: false, error: "API endpoint not found"});
    });

    library.network.app.use('/api/transactions', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err) return next();
        library.logger.error(req.url, err.toString());
        res.status(500).send({success: false, error: err.toString()});
    });
};

privated.dbSave = function (transaction, cb) {
    library.dbLite.query("INSERT INTO transactions(id, blockId, timestamp, sender, recipient, amount) VALUES($id, $blockId,$timestamp, $sender, $recipient, $amount)", transaction, cb);
};

// Events
Transactions.prototype.onBind = function (scope) {
    modules = scope;
};

shared.newTransaction = function (req, cb) {
    var {sender, recipient, amount} = req.body;
    if (!sender || !recipient || !amount) {
        cb("Request parameters are incorrect");
    }
    self.transactions.push({
        sender,
        recipient,
        amount,
        timestamp: new Date().getTime()
    });
    cb(null, "OK");
};

// Export
module.exports = Transactions;
