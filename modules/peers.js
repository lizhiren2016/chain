var WebSocket = require("ws");
var _ = require("lodash");
var Router = require('../helpers/router.js');

var modules, library, self, privated = {}, shared = {};
var sockets = [];
var MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};

// Constructor
function Peer(scope, cb) {
    library = scope;
    self = this;
    self.__private = privated;
    privated.attachApi();
    self.getPeers(function (err, peers) {
        var newPeers = _.concat(peers, library.config.peers);
        privated.connectToPeers(newPeers);
    });
    privated.initP2PServer(function (err) {
        setImmediate(cb, err, self);
    })
}

// private methods
privated.attachApi = function () {
    var router = new Router();

    router.use(function (req, res, next) {
        if (modules) return next();
        res.status(500).send({success: false, error: "Blockchain is loading"});
    });

    router.map(shared, {
        "get /": "getPeers",
        "post /addPeer": "addPeer",
    });

    router.use(function (req, res, next) {
        res.status(500).send({success: false, error: "API endpoint not found"});
    });

    library.network.app.use('/api/peers', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err) return next();
        library.logger.error(req.url, err.toString());
        res.status(500).send({success: false, error: err.toString()});
    });
};

privated.connectToPeers = function (peers) {
    peers.forEach((peer) => {
        const ws = new WebSocket(peer);
        ws.on('open', () => privated.initConnection(ws));
        ws.on('error', () => {
            console.log('connection failed')
        });
    });
};

privated.initP2PServer = function (cb) {
    const server = new WebSocket.Server({port: library.config.p2pPort});
    server.on('connection', ws => privated.initConnection(ws));
    console.log('listening websocket p2p port on: ' + library.config.p2pPort);
    cb();
};

privated.initConnection = function (ws) {
    sockets.push(ws);   // 压入已连接的节点堆栈
    privated.initMessageHandler(ws);    // 信息处理
    privated.initErrorHandler(ws);   // 错误状态处理
    privated.write(ws, privated.queryChainLengthMsg());   // 广播
    console.log('new peer:' + ws._socket.remoteAddress + ':' + ws._socket.remotePort)
};

privated.initMessageHandler = function (ws) {
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('Received message' + JSON.stringify(message));
        switch (message.type) {
            case MessageType.QUERY_LATEST:
                this.write(ws, privated.responseLatestMsg());
                break;
            case MessageType.QUERY_ALL:
                this.write(ws, privated.responseChainMsg());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                this.handleBlockchainResponse(message);
                break;
        }
    });
};

privated.responseLatestMsg = function () {
    return {
        'type': MessageType.RESPONSE_BLOCKCHAIN,
        'data': JSON.stringify([modules.blocks.lastBlock()])
    }
};

privated.initErrorHandler = function (ws) {
    const closeConnection = (ws) => {
        console.log('connection failed to peer: ' + ws.url);
        sockets.splice(sockets.indexOf(ws), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};

privated.write = function (ws, message) {
    ws.send(JSON.stringify(message));
};

privated.handleBlockchainResponse = function (message) {
    const receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    const latestBlockHeld = modules.blocks.lastBlock();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) { // 暂时保留，留着后续扩展时使用
            // console.log("We can append the received block to our chain");
            // this.chain.push(latestBlockReceived);
            // this.broadcast(this.responseLatestMsg());
        } else if (receivedBlocks.length === 1) {
            console.log("We have to query the chain from our peer");
            privated.broadcast(privated.queryAllMsg());
        } else {
            console.log("Received blockchain is longer than current blockchain");
            this.replaceChain(receivedBlocks);
        }
    } else {
        console.log('received blockchain is not longer than current blockchain. Do nothing');
    }
};

privated.broadcast = function () {
    sockets.forEach(socket => privated.write(socket, message));
};

privated.queryAllMsg = function () {
    return {'type': MessageType.QUERY_ALL};

};

privated.replaceChain = function () {

};

Peer.prototype.getPeers = function (cb) {
    library.dbLite.query("SELECT ws FROM peers WHERE state=2", null, ['ws'], function (err, rows) {
        if (err) {
            return cb(err);
        }
        var list = [];
        if (rows.length > 0) {
            rows.forEach((peer) => {
                list.push(peer.ws);
            });
        }

        return cb(null, list);
    });
};

Peer.prototype.onBind = function (scope) {
    modules = scope;
};

shared.getPeers = function (req, cb) {
    self.getPeers(function (err, peers) {
        return cb(null, peers);
    });
};

shared.addPeer = function (req, cb) {
    var {peer} = req.body;
    library.dbLite.query("SELECT ws FROM peers WHERE ws=$ws", {"ws": peer}, ['ws'], function (err, rows) {
        if (err) {
            return cb(err);
        }
        if (rows.length > 0) {
            return cb("peer already exist");
        }
        privated.savePeer(peer, function (err) {
            if (err) {
                return cb(err);
            }
            privated.connectToPeers([peer]);
            return cb(null, peer);
        });
    });
};

privated.savePeer = function (ws, cb) {
    var randomNum = library.logic.peer.getRandomNum();
    library.dbLite.query("INSERT INTO peers(id, ws) VALUES($id, $ws)", {
        id: randomNum,
        ws: ws
    }, function (err, rows) {
        if (err) {
            cb(err);
        }

        return cb(null, rows);
    });
};

// Export
module.exports = Peer;
