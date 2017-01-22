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
app.get('/favicon.ico', (req, res) => { res.status(200); });

app.get('/', (req, res) => {
    return res.redirect('/site');
});

app.post('/meeting', (req, res) => {
    // TODO validation needed
    logger.debug(req.body, 'Meeting request');

    let payload = {
        room: moniker.choose() + '-' + req.body.minutes, // ex. 'red-unicorn'
        expires_at: moment(req.body.datetime).add(req.body.minutes, 'minute').toDate()
    };

    jwt.buildJWTEncrypted(payload, JWT_HEADER, JWT_SECRET, JWT_SECRET, (err, token) => {
        if (err) {
            throw new Error(`Not able to generate JWT token: ${err.message}`);
        }

        logger.debug(payload, 'Token encrypted');

        let referer = url.parse(req.headers.referer || 'http://localhost:8080');
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

        logger.debug(token.payload, 'Token decrypted');
        logger.debug('Current date: ' + new Date());

        let expires_at = moment(token.payload.expires_at);
        let now = moment();

        if (now > expires_at) {
            return res.redirect('/site/expired.html?expires_at=' + expires_at.toISOString() + '&now=' + now.toISOString());
        }

        let room = token.payload.room;
        return res.redirect(`https://meet.tokbox.com/${room}`);
    });
});

let port = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080
let host = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'

app.listen(port, host, () => {
    logger.info('listening');
})
