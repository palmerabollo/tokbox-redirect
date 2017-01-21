const express = require('express');
const moniker = require('moniker');
const logger = require('logops');

const config = {};
const jwt = require('jwt-utils')(config);
const JWT_SECRET = process.env.JWT_SECRET || '01234567890abcde01234567890abcde01234567890abcde01234567890abcde';
const JWT_HEADER = { alg: 'A128CBC', typ: 'JWT', kid: 'id' };

const app = express();
app.get('/api/meeting', (req, res) => {
    let payload = {
        room: moniker.choose() // ex. 'red-unicorn'
    };

    jwt.buildJWTEncrypted(payload, JWT_HEADER, JWT_SECRET, JWT_SECRET, (err, token) => {
        if (err) {
            throw new Error(`Not able to generate JWT token: ${err.message}`);
        }

        let response = {
            meeting_url: `http://localhost:3000/${token}`
        }
        return res.json(response);
    });
});

app.get('/:jwt', (req, res) => {
    let token = req.param('jwt');

    jwt.readJWTEncrypted(token, JWT_SECRET, JWT_SECRET, (err, token) => {
        if (err) {
            throw new Error(`Not able to generate JWT token: ${err.message}`);
        }

        let room = token.payload.room;
        return res.redirect(`https://meet.tokbox.com/${room}`);
    });
});

let port = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3000
let host = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'

app.listen(port, host, () => {
    logger.info('listening');
})
