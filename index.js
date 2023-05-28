const express = require('express');
const app = express();
const dotenv = require('dotenv');
const connectToMongo = require('./database ');
const { errorHandler, notFound } = require('./middleware/error.js');
const path= require('path');
var cors = require('cors');
const session = require("express-session");
const passport = require("passport");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
require("./config/passport-google-oauth2-strategy");
app.use(cookieParser());

dotenv.config(); 

app.use(
  session({
    name: "Notebook",
 
    secret: process.env.SECRET_KEY,
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 1000 * 60 * 100,
    }
  })
);

connectToMongo();// connecting to database



app.use(cors()); //  Calling use(cors()) will enable the express server to respond to requests(put ,post ,delete,get).

app.use(express.json());// to accept json data


app.use(passport.initialize());
app.use(passport.session());

//Available Routes
app.use('/api/auth', require('./routes/auth')) 
app.use('/api/notes', require('./routes/notes'))
app.use('/', require('./routes/auth'));







// ----------------production -----------------
if (process.env.NODE_ENV === 'production') 
 {
    //*Set static folder up in production
    app.use(express.static('frontend/build'));

    app.get('*', (req,res) => res.sendFile(path.resolve(__dirname, 'frontend', 'build','index.html')));
  }
// ------------------production---------------



// Error Handling middlewares
app.use(notFound); // if no route is found then this middleware will run
app.use(errorHandler); // if any error occurs in any route 

const PORT = process.env.PORT || 5000; 

app.listen(PORT, console.log(`Notebook backend listening on port ${PORT}`))
