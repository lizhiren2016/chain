var dblite = require('dblite');
var async = require('async');

var isWin = /^win/.test(process.platform);
var isMac = /^darwin/.test(process.platform);

dblite.bin = "C:\\sqlite\\sqlite3.exe";

module.exports.connect = function (connectString, cb) {
    var db = dblite(connectString);
    var sql = [
        "CREATE TABLE IF NOT EXISTS blocks (id VARCHAR(20) PRIMARY KEY, timestamp INT NOT NULL, proof INT NOT NULL, previousHash VARCHAR(250) NOT NULL, height INT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS transactions (id VARCHAR(20) PRIMARY KEY, blockId VARCHAR(20) NOT NULL, timestamp INT NOT NULL, sender VARCHAR(20) NOT NULL, recipient VARCHAR(20) NOT NULL, amount INT NOT NULL, FOREIGN KEY(blockId) REFERENCES blocks(id) ON DELETE CASCADE)",
        "CREATE TABLE IF NOT EXISTS peers (id VARCHAR(20) NOT NULL PRIMARY KEY, ws VARCHAR(20) NOT NULL, state TINYINT NOT NULL DEFAULT 2)",
        "PRAGMA foreign_keys = ON",
        "PRAGMA synchronous=OFF",
        "PRAGMA journal_mode=MEMORY",
        "PRAGMA default_cache_size=10000",
        "PRAGMA locking_mode=EXCLUSIVE"
    ];

    async.eachSeries(sql, function (command, cb) {
        db.query(command, function (err, data) {
            cb(err, data);
        });
    }, function (err) {
        if (err) {
            console.log(err)
            return cb(err, db);
        }
    });
    cb(null, db);
}
