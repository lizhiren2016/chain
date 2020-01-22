var genesisblock = null

// Constructor
function Transaction(scope, cb) {
    this.scope = scope;
    genesisblock = this.scope.genesisblock;
    cb && setImmediate(cb, null, this);
}

// private methods
var privated = {};

// Public methods
Transaction.prototype.dbSave = function (trs, cb) {
    this.scope.dbLite.query("INSERT INTO transactions(id, blockId, timestamp, sender, recipient, amount) VALUES($id, $blockId, $timestamp, $sender, $recipient, $amount)", {
        id: trs.id,
        blockId: trs.blockId,
        timestamp: trs.timestamp,
        amount: trs.amount,
        sender: trs.sender,
        recipient: trs.recipient,
    }, cb);

};

// Export
module.exports = Transaction;
