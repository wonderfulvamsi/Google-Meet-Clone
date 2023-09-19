const functions = require("firebase-functions");
const express = require('express');
const cors = require('cors')
const app = express();
const Room = require("./models/room.model");
const User = require("./models/user.model");
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
app.use(cors())

app.use(express.json())

mongoose.connect(`mongodb+srv://vid-chat-auth-server:idx7p4XV1L7kfVUw@cluster0.cjiv06u.mongodb.net/VidChatDB?retryWrites=true&w=majority`,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
})


var refreshTokens = [];

const generateAccessToken = (user) => {
    return jwt.sign({ email: user.email }, "my_access_private_key", {
        expiresIn: "10s",
    });
};

const generateRefreshToken = (user) => {
    return jwt.sign({ email: user.email }, "my_refresh_private_key");
};

//REGISTER
app.post("/auth/signup", async (req, res) => {
    try {
        if (await User.findOne({ email: req.body.email })) {
            res.status(200).send("already registered!");
        }
        else{
            //generate new password
            // const salt = await bcrypt.genSalt(10);
            // const hashedPassword = await bcrypt.hash(req.body.password, salt);

            //create new user
            const newUser = new User({
                email: req.body.email,
                password: req.body.password, // hashedPassword,
            });

            //save user and respond
            const user = await newUser.save();
            const accessToken = generateAccessToken(user)
            const refreshToken = generateRefreshToken(user)

            refreshTokens.push(refreshToken);
            res.status(200).json({
                user,
                'accesstoken': accessToken,
                'refreshtoken': refreshToken
            });
        }
    } catch (err) {
        res.status(500).json(err)
    }
});

//LOGIN
app.post("/auth/login", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            res.status(200).json(null);
        }
        else {
            const validPassword = req.body.password == user.password
            if (!validPassword) {
                res.status(200).json(null);
            }
            else {
                const accessToken = generateAccessToken(user)
                const refreshToken = generateRefreshToken(user)

                refreshTokens.push(refreshToken);
                res.status(200).json({
                    user,
                    'accesstoken': accessToken,
                    'refreshtoken': refreshToken
                })
            }
        }
    } catch (err) {
        res.status(500).json(err)
    }
});

//Refresh token 
app.post("/auth/jwt/refresh", (req, res) => {
    //take the refresh token from the user
    const refreshToken = req.body.token;

    //send error if there is no token or it's invalid
    if (!refreshToken) return res.status(401).json("You are not authenticated!");
    if (refreshTokens.length) {
        //check *only* if there exisits any tokes in the array else the first entry will always give thia error
        if (!refreshTokens.includes(refreshToken)) {
            return res.status(403).json("Refresh token is not valid!");
        }
    }
    jwt.verify(refreshToken, "my_refresh_private_key", (err, user) => {
        err && console.log(err);
        refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        refreshTokens.push(newRefreshToken);

        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    });
});


const verify_token = (req, res, next) => {
  const authHeader = req.body.authorization;
  if (authHeader) {
      const token = authHeader.split(" ")[1];
      jwt.verify(token, "my_access_private_key", (err, user) => {
          if (err) {
              return res.status(403).json("Token is not valid! You Fucker!");
          }
          next();
      });
  } else {
      res.status(401).json("Asshole! You are not authenticated!");
  }
}

//get messages

app.post("/room/:roomid/:username/get_messages", verify_token, async (req, res) => {
  console.log("getting msg",req.body)
  try {
      let roominfo = await Room.findOne({
          roomid: req.params.roomid,
      });
      console.log("room:",roominfo)
      if(roominfo){
          //do nothing
      }
      else{
          const newroom = new Room({
              roomid: req.params.roomid,
              messages: []
          });
          roominfo = await newroom.save()
      }
      await roominfo.updateOne({ $push: { messages: req.body.msg } })
      const newroominfo = await Room.findOne({
          roomid: req.params.roomid,
      });
      res.status(200).json(newroominfo.messages);
  } catch (err) {
      res.status(500).json(err);
  }
});



//add a message

app.post("/room/:roomid/:username/send_message", verify_token, async (req, res) => {
  try {
      let roominfo = await Room.findOne({
          roomid: req.params.roomid,
      });
      console.log("room:",roominfo)
      if(roominfo){
          //do nothing
      }
      else{
          const newroom = new Room({
              roomid: req.params.roomid,
              messages: []
          });
          roominfo = await newroom.save()
      }
      await roominfo.updateOne({ $push: { messages: req.body.msg } })
      const newroominfo = await Room.findOne({
          roomid: req.params.roomid,
      });
      res.status(200).json(newroominfo.messages);
  } catch (err) {
      res.status(500).json(err);
  }
});




app.get('/', (req, res) => {
    res.send('<h1>Hey, this is the Auth-Server to handel all the Auth related shit.</h1>');
  });

exports.expressApi = functions.https.onRequest(app)