const express = require('express');
const path = require('path');
const publicRouter = express.Router();
const services = require('../services/services');

publicRouter.route('/').get(async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../index.html'));
    } catch (err) {
        throw new Error(err)
    }
});

publicRouter.route('/data').post(async (req, res) => {
    try {
        const result = await services.createFile(req.body, req.files);
        let name = "ALL_LICENSE";
        if (req.body.outputName) {
            name = req.body.outputName;
        }
        res.attachment(name)
        res.type('txt')
        res.send(result)
    } catch (err) {
        console.error(err);
    }
});
module.exports = publicRouter;
