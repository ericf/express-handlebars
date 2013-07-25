var express = require('express'),
    exphbs  = require('../../'), // "express3-handlebars"

    app = express();

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.get('/', function (req, res) {
    res.render('home');
});

app.listen(3000);

console.log('express3-handlebars example server listening on: 3000');
