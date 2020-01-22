var WebSocket = require("ws");
const Common = require('./Common');

class P2P {
    constructor(blockChain) {
        // this.port = process.env.P2P_PORT || 6002;
        this.blockChain = blockChain;
        this.sockets = [];
        this.MessageType = {
            QUERY_LATEST: 0,
            QUERY_ALL: 1,
            RESPONSE_BLOCKCHAIN: 2
        };
    }

    // 建立P2P网络
    initP2PServer(port) {
        const server = new WebSocket.Server({port: port});
        server.on('connection', ws => this.initConnection(ws));
        console.log('listening websocket p2p port on: ' + port);
    }

    connectToPeers(scope) {
        const newPeers = scope.config.peers.list;
        scope.dbLite.query("DELETE FROM blocks WHERE id = $id", {id: blockId}, function (err, res) {
            cb(err, res);
        });
        newPeers.forEach((peer) => {
            const ws = new WebSocket(peer);
            ws.on('open', () => this.initConnection(ws));
            ws.on('error', () => {
                console.log('connection failed')
            });
        });
    }

    // 初始化连接
    initConnection(ws) {
        this.sockets.push(ws);   // 压入已连接的节点堆栈
        this.initMessageHandler(ws);    // 信息处理
        this.initErrorHandler(ws);   // 错误状态处理
        this.write(ws, this.queryChainLengthMsg());   // 广播
        console.log('new peer:' + ws._socket.remoteAddress + ':' + ws._socket.remotePort)
    }

    initMessageHandler(ws) {
        ws.on('message', (data) => {
            const message = JSON.parse(data);
            console.log('Received message' + JSON.stringify(message));
            switch (message.type) {
                case this.MessageType.QUERY_LATEST:
                    this.write(ws, this.responseLatestMsg());
                    break;
                case this.MessageType.QUERY_ALL:
                    this.write(ws, this.responseChainMsg());
                    break;
                case this.MessageType.RESPONSE_BLOCKCHAIN:
                    this.handleBlockchainResponse(message);
                    break;
            }
        });
    }

    initErrorHandler(ws) {
        const closeConnection = (ws) => {
            console.log('connection failed to peer: ' + ws.url);
            this.sockets.splice(this.sockets.indexOf(ws), 1);
        };
        ws.on('close', () => closeConnection(ws));
        ws.on('error', () => closeConnection(ws));
    }

    write(ws, message) {
        ws.send(JSON.stringify(message));
    }

    getPeers() {
        return this.sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort);
    }

    responseLatestMsg() {
        return {
            'type': this.MessageType.RESPONSE_BLOCKCHAIN,
            'data': JSON.stringify([this.blockChain.lastBlock()])
        }
    }

    responseChainMsg() {
        return {
            'type': this.MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(this.blockChain.chain)
        }
    }

    // 同步区块链信息
    handleBlockchainResponse(message) {
        const receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
        const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        const latestBlockHeld = this.blockChain.lastBlock();
        if (latestBlockReceived.index > latestBlockHeld.index) {
            console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
            if (latestBlockHeld.hash === latestBlockReceived.previousHash) { // 暂时保留，留着后续扩展时使用
                // console.log("We can append the received block to our chain");
                // this.chain.push(latestBlockReceived);
                // this.broadcast(this.responseLatestMsg());
            } else if (receivedBlocks.length === 1) {
                console.log("We have to query the chain from our peer");
                this.broadcast(this.queryAllMsg());
            } else {
                console.log("Received blockchain is longer than current blockchain");
                this.replaceChain(receivedBlocks);
            }
        } else {
            console.log('received blockchain is not longer than current blockchain. Do nothing');
        }
    }

    broadcast(message) {
        this.sockets.forEach(socket => this.write(socket, message));
    }

    queryAllMsg() {
        return {'type': this.MessageType.QUERY_ALL};
    }

    replaceChain(newBlocks) {
        if (this.isValidChain(newBlocks) && newBlocks.length > this.blockChain.chain.length) {
            console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
            this.blockChain.replaceChain(newBlocks);
            this.broadcast(this.responseLatestMsg());
        } else {
            console.log('Received blockchain invalid');
        }
    }

    isValidChain(blockchainToValidate) {
        var tempBlocks = [blockchainToValidate[0]];
        for (var i = 1; i < blockchainToValidate.length; i++) {
            if (Common.isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
                tempBlocks.push(blockchainToValidate[i]);
            } else {
                return false;
            }
        }
        return true;
    }

    queryChainLengthMsg() {
        return {'type': MessageType.QUERY_LATEST};
    }
}

module.exports = new P2P();
