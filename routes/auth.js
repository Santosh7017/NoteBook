const express = require("express");
const router = express.Router();// to create routes
const User = require("../models/User"); // import user schema from database
const { body, validationResult } = require("express-validator"); // used in body of request
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const passport = require("passport");

const dotenv = require('dotenv');
dotenv.config();
let fetchuser = require("../middleware/fetchuser");
require("../config/passport-google-oauth2-strategy");

const secret = process.env.SECRET_KEY;

// Create a user using POST '/api/routes'. Dosen't require login
// Post means we create or update database
router.post(
  "/createuser",
  [
    body("email", "Enter a valid Email").isEmail(),
    body("name", "Enter a valid name").isLength({ min: 3 }),
    body("password", "Password must be atleast of 5 characters").isLength({
      min: 5,
    }),
  ],
  async (req, res) => {
    let success = false;

    // if there are errors in request, return bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      // check whether user with this email already exist in user schema
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        return res
          .status(400)
          .json({ success, error: "A user with this email already exist" });
      }
      // use of bcrypt to encrypt password
      var salt = bcrypt.genSaltSync(10); // it creates a salt of 10 characters
      const secPass = bcrypt.hashSync(req.body.password, salt); // it adds salt to password and then encrypts it
      // user schema
      user = await User.create({
        email: req.body.email,
        name: req.body.name,
        password: secPass,
      });

      // use of jwt token to provide secure communication between client and server
      // it generate a token which has 3 parts
      // 1. algorthims and type of token
      // 2. payload which is data
      // 3. secret key

      const data = {
        user: {
          id: user.id,
        },
      };

      var authtoken = jwt.sign(data, secret);
      success = true;
      res.send({ success, authtoken, name: req.body.name });
      //end of jwt use
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Internal server error has occured");
    }
  }
);

//Login a user using credentials
// here we use post because we are sending data to server
router.post(
  "/login",
  [
    body("email", "Enter a valid Email").isEmail(),
    body("password", "Password cannot be blank").exists(),
  ],
  async (req, res) => {
    // if there are errors in request, return bad request and the errors
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    //
    const { email, password } = req.body;
    try {
      // check whether user with this email  exist
      let user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ success, error: "Please login using correct credentials" });
      }
      console.log(user)
      // use of bcrypt to compare password it return true or false
      let passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res
          .status(400)
          .json({ success, error: "Please login using correct credentials" });
      }
      // use of jwt token to provide secure communication between client and server
      const data = {
        user: {
          id: user.id,
        },
      };
      var authtoken = jwt.sign(data, secret);
      success = true;
      res.json({ success, authtoken, name: user.name });
      //end of jwt use
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Internal server error has occured");
    }
  }
);

// get user details
// it first call the middleware fetchuser which check whether user is valid or not
// fetchuser takes the auth-token from request header and then verify it using jwt
//then call the next function
router.post("/getuser", fetchuser, async (req, res) => {
  try {
    const userID = req.user.id;
    // check whether user with this email  exist
    let user = await User.findOne({ userID }).select("-password");
    res.send(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal server error has occured");
  }
});



/* This code is creating a route for handling the callback URL after a user has successfully
authenticated with their Google account. It uses the `passport.authenticate` middleware with the
"google" strategy to handle the authentication process. If the authentication is successful, the
user is redirected to the "http://localhost:3000" URL. If the authentication fails, the user is
redirected to the "/login/failed" URL. */


router.get('/auth/google', (req, res) => {
  const googleAuthURL = 'https://accounts.google.com/o/oauth2/v2/auth';

  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: process.env.CALLBACK_URL, // Replace with your redirect URI
    scope: 'profile email',
    client_id: process.env.CLIENT_ID, // Replace with your client ID
  });

  const redirectURL = `${googleAuthURL}?${params}`;

  res.json({ url: redirectURL });
});

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: process.env.successURL,
    failureRedirect: "/login/failed",
  })
);





/* This code creates a route for handling the case when a user fails to authenticate during the login
process. It sends a JSON response with a status code of 401 (Unauthorized) and an error message
indicating that the user failed to authenticate. */
router.get("/login/failed", (req, res) => {
  res.status(401).json({ error: true, message: "User failed to authenticate." });
});


router.get("/login/success", (req, res) => {
  if (req.user) {

    const data = {
      user: {
        id: req.user.id,
      },
    };

    res.status(200).json({
      success: true,
      error: false,
      message: "Successfully Loged In",
      user: req.user,
      accessToken: jwt.sign(data, secret),

    });



  } else {
    res.status(403).json({ error: true, message: "Not Authorized" });
  }
});


router.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.log(err);
      return;
    }
    return res.status(200).json({
      success: true,
    });
  });

})

module.exports = router;
