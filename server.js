const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

mongoose.connect(process.env.MONGO_URI, { useMongoClient: true });

const userSchema = mongoose.Schema({
    user: { type: String, required: true }
});
const exerciseSchema = mongoose.Schema({
    uid: { type: String, required: true },
    desc: { type: String, required: true },
    dur: { type: Number, required: true },
    date: { type: Date, required: false }
});

const User = mongoose.model('User', userSchema);
const Log = mongoose.model('Log', exerciseSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res, next) => {
    let user = req.body.username;
    const userDoc = new User({ user: user });
    userDoc.save((err, data) => {
        if (err) console.log(err.message);
    });
    res.json({ "_id": userDoc["_id"], "user": userDoc.user });
});

app.get('/api/exercise/users', (req, res, next) => {
    User.find({}, '-__v', (err, users) => {
        if (err) return next(err);
        res.json(users);
    });
});

app.post('/api/exercise/add', (req, res) => {
    let uid = req.body.userId;
    let desc = req.body.description;
    let dur = req.body.duration;
    let dat = req.body.date || Date.now();

    User.findById(uid, '-__v').
    populate('logDetails').
    exec((err, userData) => {
        const logDoc = new Log({
            uid,
            desc,
            dur,
            date: dat
        });

        logDoc.save((err, data) => {
            if (err) console.log(err.message);
            res.json({
                'uid': userData._id,
                'user': userData.user,
                'desc': data.desc,
                'dur': data.dur,
                'date': data.date
            });
        });
    });
});

app.get('/api/exercise/log', (req, res, next) => {
    let userId = req.query.userId;
    if (!userId) throw new Error('You must provide a User ID!');

    let from = new Date(req.query.from) || new Date(2000 - 01 - 01);
    let to = new Date(req.query.to) || new Date(3000 - 01 - 01);
    let limit = req.query.limit || 9999;
    let logData = [];

    User.findById(userId, (err, users) => {
        Log.find({}, '-uid -__v').
        gt('date', from).
        lt('date', to).
        limit(limit).
        exec((err, logs) => {
            logs.forEach((log) => {
                logData.push(log);
            });
            res.json({ users, logData });
        });
    });
});


// Not found middleware
app.use((req, res, next) => {
    return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
    let errCode, errMessage

    if (err.errors) {
        // mongoose validation error
        errCode = 400 // bad request
        const keys = Object.keys(err.errors)
        // report the first validation error
        errMessage = err.errors[keys[0]].message
    }
    else {
        // generic or custom error
        errCode = err.status || 500
        errMessage = err.message || 'Internal Server Error'
    }
    res.status(errCode).type('txt')
        .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})
