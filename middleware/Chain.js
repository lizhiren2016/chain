const BlockChain = require('../src/BlockChain/lib/BlockChain');
const {validationResult} = require('express-validator');
var WebSocket = require("ws");

class Chain {
    constructor(scope) {
        this.blockChain = new BlockChain(scope);
        this.getChain = this.getChain.bind(this);
        this.newTransaction = this.newTransaction.bind(this);
        this.getPeers = this.getPeers.bind(this);
        this.connectToPeers = this.connectToPeers.bind(this);
        this.mine = this.mine.bind(this);
    }

    newTransaction(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({errors: errors.mapped()});
        }
        const trans = req.body;
        const index = this.blockChain.newTransaction(trans['sender'], trans['recipient'], trans['amount']);
        const responseValue = {
            message: `Transaction will be added to Block ${index}`
        };
        req.responseValue = responseValue;
        return next();
    }

    mine(req, res, next) {
        const newBlock = this.blockChain.mine();
        const responseValue = Object.assign({
            message: 'New Block mined'
        }, newBlock);
        req.responseValue = responseValue;
        return next()
    }

    getChain(req, res, next) {
        req.responseValue = {
            message: 'Get Chain',
            chain: this.blockChain.getChain()
        };
        return next();
    }

    getPeers(req, res, next) {
        const peers = this.blockChain.p2p.getPeers();
        req.responseValue = {
            message: 'Get Peers',
            chain: peers
        };
        return next();
    }

    connectToPeers(newPeers) {
        // newPeers.forEach((peer) => {
        //     const ws = new WebSocket(peer);
        //     ws.on('open', () => this.blockChain.p2p.initConnection(ws));
        //     ws.on('error', () => {
        //         console.log('connection failed')
        //     });
        // });
    }

    initP2PServer() {
        // this.blockChain.p2p.initP2PServer();
    }
}

module.exports = new Chain();
