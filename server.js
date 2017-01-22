const express = require('express');
const moniker = require('moniker');
const logger = require('logops');
const moment = require('moment');
const url = require('url');
const bodyParser = require('body-parser')

const config = {};
const jwt = require('jwt-utils')(config);
const JWT_SECRET = process.env.JWT_SECRET || '01234567890abcde01234567890abcde01234567890abcde01234567890abcde';
const JWT_HEADER = { alg: 'A128CBC', typ: 'JWT', kid: 'id' };

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/site', express.static('site'));

app.post('/meeting', (req, res) => {
    // TODO validation needed

    let payload = {
        room: moniker.choose(), // ex. 'red-unicorn'
        expires_at: moment(req.body.datetime).add(req.body.minutes, 'minute')
    };

    jwt.buildJWTEncrypted(payload, JWT_HEADER, JWT_SECRET, JWT_SECRET, (err, token) => {
        if (err) {
            throw new Error(`Not able to generate JWT token: ${err.message}`);
        }

        let referer = url.parse(req.headers.referer || 'http://localhost:3000');

        let response = {
            meeting_id: payload.room,
            meeting_url: `${referer.protocol}//${referer.host}/${token}`
        }

        return res.json(response);
    });
});

app.get('/:jwt', (req, res) => {
    let token = req.params.jwt;

    jwt.readJWTEncrypted(token, JWT_SECRET, JWT_SECRET, (err, token) => {
        if (err) {
            throw new Error(`Not able to generate JWT token: ${err.message}`);
        }

        let expires_at = moment(token.payload.expires_at);
        let now = moment();

        if (now > expires_at) {
            return res.redirect('/site/expired.html');
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
