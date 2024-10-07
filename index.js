const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const mysql = require('mysql2');
const app = express();

const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'src')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
}));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'blog_user',
    password: 'yourpassword',
    database: 'blog_app',
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Database.');
});

app.get('/', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    const query = 'SELECT blogs.id, blogs.title, blogs.content, blogs.user_id, users.username FROM blogs INNER JOIN users ON blogs.user_id = users.id';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render(path.join(__dirname, 'src', 'index.ejs'), { blogs: results, session: req.session });
    });
});

app.get('/register', (req, res) => {
    res.render(path.join(__dirname, 'src', 'register.ejs'));
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(query, [username, hashedPassword], (err, results) => {
        if (err) throw err;
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render(path.join(__dirname, 'src', 'login.ejs'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            return res.redirect('/login');
        }
        const user = results[0];
        if (!bcrypt.compareSync(password, user.password)) {
            return res.redirect('/login');
        }
        req.session.userId = user.id;
        res.redirect('/');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/login');
    });
});

app.get('/add', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render(path.join(__dirname, 'src', 'add.ejs'));
});

app.post('/add', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    const { title, content } = req.body;
    const query = 'INSERT INTO blogs (user_id, title, content) VALUES (?, ?, ?)';
    db.query(query, [req.session.userId, title, content], (err, results) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.get('/edit/:id', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    const query = 'SELECT * FROM blogs WHERE id = ? AND user_id = ?';
    db.query(query, [req.params.id, req.session.userId], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            return res.redirect('/');
        }
        res.render(path.join(__dirname, 'src', 'edit.ejs'), { blog: results[0] });
    });
});

app.post('/edit/:id', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    const { title, content } = req.body;
    const query = 'UPDATE blogs SET title = ?, content = ? WHERE id = ? AND user_id = ?';
    db.query(query, [title, content, req.params.id, req.session.userId], (err, results) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.post('/delete/:id', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    const query = 'DELETE FROM blogs WHERE id = ? AND user_id = ?';
    db.query(query, [req.params.id, req.session.userId], (err, results) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.use((err, req, res, next) => {
    console.error('Error stack:', err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
