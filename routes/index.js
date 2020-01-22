const express = require('express');
const router = express.Router();
const {check} = require('express-validator');
const Chain = require('../middleware/Chain');

// 可以运行时初始化 peers,又或者通过其他接口获取 peers
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];

// 初始化 peer 和 p2pServer
Chain.connectToPeers(initialPeers);
Chain.initP2PServer();

const responseMiddleware = (req, res, next) => {
    return res.json(req.responseValue)
};

router.post('/transactions/new', [
    check('sender', 'Sender must be a String').exists(),
    check('recipient', 'Sender must be a String').exists(),
    check('amount', 'Sender must be a String').exists()
], Chain.newTransaction, responseMiddleware)

router.get('/mine', Chain.mine, responseMiddleware);

router.get('/chain', Chain.getChain, responseMiddleware);

router.get('/peers', Chain.getPeers, responseMiddleware);

router.post('/addPeer', [
    check('peer', 'Node must be a array').exists()
], function (req, res, next) {
    Chain.connectToPeers([req.body.peer]);
    req.responseValue = {
        message: 'Add Peer',
        peer: req.body.peer
    };
    return next();
}, responseMiddleware);


module.exports = router;
