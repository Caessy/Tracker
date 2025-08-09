const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('../db.js');

const router = express.Router();

// register user with username and password
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({error: 'username or password cannot be blank.'});
    }

    try {
        const hashPassword = await bcrypt.hash(password, 10);

        const stmt = db.prepare(`
            INSERT INTO users (username, email, password)
            VALUES(?, ?, ?)
        `)
        stmt.run(username, email, hashPassword);
        
        res.status(201).json({ message: 'Register Success!' });

    } catch (err) {
        res.status(500).json({error: 'server error'});
    }
});

// login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({message: 'username or password cannot be blank.'});
    }

    try {
        // try to find the user in the database
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ message: 'wrong username or password!' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'wrong username or password.' });
        }

        req.session.user_id = user.id;
        res.json({ message: 'Login Success!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

//profile
router.get('/profile', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({message: 'not logged in'});
    }

    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.session.user_id);
    res.json(user);
});

// log out
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.err('Session destroy failed: ', err);
            return res.status(500).json({ error: 'Failed to log out.' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out Success' });
    })
});


module.exports = router;