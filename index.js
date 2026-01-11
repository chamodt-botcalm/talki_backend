const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const moment = require("moment");
const bcrypt = require("bcryptjs");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
const fs = require("fs");
const UserModel = require("./models/user");
const ChatMessageModel = require("./models/chatMessages");
const { forEachAsync } = require("foreachasync");
const path = require("path");
const StatusModel = require("./models/status");
const StatusViewModel = require("./models/statusViews");
const StickersModel = require("./models/stickers");
const MutedChatsModel = require("./models/mutedChats");
const ArchivedChatsModel = require("./models/archivedChats");
const LedgerModel = require("./models/ledger");
const UserListsModel = require("./models/userLists");
const UserWalletsModel = require("./models/userWallets");
const TokensModel = require("./models/tokens");

const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const serviceAccount = require("./talkie-37471-firebase-adminsdk-rs1qb-b5c2c67854.json");
const TransactionsModel = require("./models/transactions");
const CallHistoryModel = require("./models/callHistory");
const PinnedChatsModel = require("./models/pinnedChats");
const { default: Web3 } = require("web3");
const { getAuth } = require("firebase-admin/auth");
const functions = require("./common/functions");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT;
const server = http.createServer(app);
const io = socketIo(server, {
  maxHttpBufferSize: 1e8, // 100 MB
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/.well-known", express.static(path.join(__dirname, ".well-known")));

mongoose.connect(process.env.MONGODB_DRIVER_URL);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

io.on("connection", async (socket) => {
  // Join room
  socket.on("join", (roomName) => {
    socket.join(roomName);
  });

  // Leave room
  socket.on("leave", (roomName) => {
    socket.leave(roomName);
  });

  socket.on("changeCamera", (userId, camOn) => {
    console.log("audio changed", userId, camOn);
    io.to(userId).emit("changedCamera", camOn);
  });

  socket.on("switchVideo", (userId) => {
    console.log("mode changed", userId);
    io.to(userId).emit("switchedVideo");
  });

  socket.on("changeAudio", (userId, audioOn) => {
    console.log("audio changed", userId, audioOn);
    io.to(userId).emit("changedAudio", audioOn);
  });

  socket.on("switchVideoReject", (userId) => {
    console.log("mode changed", userId);
    io.to(userId).emit("switchVideoRejected");
  });

  socket.on("switchVideoAccept", (userId) => {
    console.log("mode changed", userId);
    io.to(userId).emit("switchVideoAccepted");
  });

  socket.on("call", async (username, rec) => {
    const callType = rec.video == true ? "video" : "audio";
    io.to(rec.reciever).emit("call", rec.sender, username, callType, rec);
    //create call record
    await CallHistoryModel.create({
      _id: rec._id,
      sender: rec.sender,
      reciever: rec.reciever,
      video: rec.video,
      answered: rec.answered,
      createdat: rec.createdat,
    });

    const caller = await UserModel.findOne({ _id: rec.reciever });
    const registrationToken = caller.fcmtoken;
    const message = {
      data: {
        type: "call",
        callType: callType,
        fromId: rec.sender,
        username: username,
        rec: JSON.stringify(rec),
      },
      token: registrationToken,
      android: {
        ttl: 604800, // 7 days in seconds
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
        headers: {
          "apns-push-type": "background",
          "apns-priority": "5",
          "apns-topic": "com.talkie", // your app bundle identifier
        },
      },
    };
    
    admin
      .messaging()
      .send(message)
      .then((response) => {
        console.log("Notification sent:", response);
      })
      .catch((error) => {
        console.error("Error sending notification:", error);
      });
  });

  socket.on("available", async (userId, fromId) => {
    io.to(fromId).emit("available", userId);
  });

  socket.on("answeredTime", async (cid, time) => {
    const call = await CallHistoryModel.findOne({ _id: cid });
    call.answered = true;
    call.answeredat = time;
    call.save();
  });

  socket.on("offer", async (offer, userId, fromId, username, callType) => {
    //console.log('received offer:', userId);
    io.to(userId).emit("offer", offer, fromId, username, callType);
    //socket.broadcast.emit('offer', offer);
  });

  socket.on("disconnect", () => {
    //console.log("user disconnected");
  });

  //send messages
  socket.on("message", async (msg) => {
    const time=moment.utc();
    let msgText = msg.message;
    if (msg.type == "image" || msg.type == "audio") {
      msgText = msg.filename;
      // Generate unique filename
      const filePath = path.join(__dirname, "uploads/media", msg.filename);

      fs.writeFile(filePath, msg.message, "base64", (err) => {
        //if (err) throw err;
      });
    } else if (msg.type == "file") {
      msgText = msg.filename;
      const filePath = path.join(__dirname, "uploads/media", msg.filename);

      fs.writeFile(filePath, msg.message, (err) => {
        //if (err) throw err;
      });
    }

    // Save the message to MongoDB
    let message;
    if (msg.edit == true) {
      message = await ChatMessageModel.findOneAndUpdate(
        {
          _id: msg.editMsg._id,
        },
        {
          $set: { message: msg.message, edited: true },
        },
        { new: true }
      );
    } else {
      message = await ChatMessageModel.create({
        _id: msg.id,
        sender: msg.sender,
        reciever: msg.reciever,
        type: msg.type,
        message: msgText,
        reply: msg.reply,
        replyTo: msg.replyTo,
        replyMsg: msg.replyText,
        createdat: time,
      });
    }

    io.to(msg.sender).emit("messagetime", msg.id,time);
    io.to(msg.reciever).emit("message", message);
    //get user details
    const r = await UserModel.findOne({ _id: msg.reciever });
    const s = await UserModel.findOne({ _id: msg.sender });
    const list = await UserListsModel.findOne({
      $or: [
        {
          user1: msg.sender,
          user2: msg.reciever,
        },
        {
          user1: msg.reciever,
          user2: msg.sender,
        },
      ],
    });

    let notification=list.user1==msg.reciever?list.notificationsUser2:list.notificationsUser1;
    notification=notification!=undefined?notification:true;
    const muted = await MutedChatsModel.countDocuments({
      userid: msg.reciever,
      muted_userid: msg.sender,
    });
    //fcm notification body
    if (muted == 0 && notification!=false && r.notifications!=false) {
      const finaluser = {
        _id: list._id,
        userid: s._id,
        firstname: s.firstname,
        lastname: s.lastname,
        username: s.username,
        image: s.image,
        walletName: s.walletName,
        walletAddress: s.walletAddress,
        bio: s.bio,
        fcmtoken: s.fcmtoken,
        createdat: list.createdat,
      };

      const msgBody=message.type=='text'?message.message.substring(0, 49):message;
      
      let msg = {
        notification: {
          title: s.username,
          body: msgBody,
        },
        data: {
          reciever: JSON.stringify(finaluser),
        },
        token: r.fcmtoken,
      };

      if(r.messagePreview==false){
        msg = {
          notification: {
            title: s.username,
          },
          data: {
            reciever: JSON.stringify(finaluser),
          },
          token: r.fcmtoken,
        };
      };

      //send fcm notifications
      admin
        .messaging()
        .send(msg)
        .then((response) => {
          console.log("Notification sent:", response);
        })
        .catch((error) => {
          console.error("Error sending notification:", error);
        });
    }
  });

  socket.on("seenmessage", async (user, user2) => {
    await ChatMessageModel.updateMany(
      {
        sender: user,
        reciever: user2,
        seen: false,
      },
      {
        $set: { seen: true, seenat: moment.utc() },
      }
    );
    io.to(user).emit("seenmessage", user2);
  });

  socket.on("tochannel", (socketId) => {
    io.to(socketId).emit("chat fromchannel", "done");
  });

  // Handle answer creation and forwarding
  socket.on("answer", async (answer, fromId, userId) => {
    //console.log('received answer:', answer);
    io.to(fromId).emit("answer", answer);
  });

  // Handle ICE candidate forwarding
  socket.on("icecandidate", (icecandidate, userId) => {
    //console.log('received icecandidate:', userId);
    io.to(userId).emit("icecandidate", icecandidate);
    //socket.broadcast.emit('icecandidate', icecandidate);
  });

  socket.on("hangup", async (id, type, cid, time) => {
    console.log(id, type, cid, time);
    io.to(id).emit("hangup", type, time);

    const user=await UserModel.findOne({_id:id});

    const message = {
      data: {
        type: "hangup"
      },
      token: user.fcmtoken,
      android: {
        ttl: 604800, // 7 days in seconds
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
        headers: {
          "apns-push-type": "background",
          "apns-priority": "5",
          "apns-topic": "com.talkie", // your app bundle identifier
        },
      },
    };
    admin
      .messaging()
      .send(message)
      .then((response) => {
        console.log("Notification sent:", response);
      })
      .catch((error) => {
        console.error("Error sending notification:", error);
      });



    const call = await CallHistoryModel.findOne({ _id: cid });
    if (call) {
      call.endedat = time;
      call.save();
    }
  });

  socket.on("sendstatus", async (status) => {
    const fileName = uuidv4() + ".jpg"; // Generate unique filename
    const filePath = path.join(__dirname, "uploads/status", fileName);

    fs.writeFile(filePath, status.status, "base64", (err) => {
      if (err) throw err;
    });

    const newStatus = await StatusModel.create({
      userid: status.sender,
      status: fileName,
      type: status.type,
      createdat: moment.utc(),
      expiredat: moment.utc().add(24, "hours"),
    });

    // Broadcast the message to all connected clients
    io.emit("status", newStatus);
  });
});

app.post("/forwardMessage", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { senderid, recieverid, ids } = req.body;

    const r = await UserModel.findOne({ _id: recieverid });
    const msgs = await ChatMessageModel.find({
      _id: { $in: ids },
    });

    forEachAsync(msgs, async function (msg) {
      const sender = await UserModel.findOne({ _id: msg.sender });
      const m = await ChatMessageModel.create({
        _id: uuidv4(),
        sender: senderid,
        reciever: recieverid,
        type: msg.type,
        message: msg.message,
        forwarded: true,
        forwardedFrom: sender.firstname,
        createdat: moment.utc(),
      });

      //notify
      io.to(recieverid).emit("message", m);
      io.to(senderid).emit("message", m);
      //fcm notification body
      const message = {
        notification: {
          title: r.username,
          body: msg.message,
        },
        token: r.fcmtoken,
      };

      //send fcm notifications
      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("Notification sent:", response);
        })
        .catch((error) => {
          console.error("Error sending notification:", error);
        });
    }).then(function () {
      return res.json({
        status: 200,
        msg: "Success",
      });
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.post("/saveMessage", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { userid, ids, saved } = req.body;

    await forEachAsync(ids, async function (id) {
      const msg=await ChatMessageModel.findOne({_id:id});
      if(msg.sender==userid){
        msg.senderSaved=saved;
      }else{
        msg.recieverSaved=saved;
      }
      msg.save();
    }).then(function () {
      res.json({
        status: 200,
        msg: "done",
      });
    });

    /* await ChatMessageModel.updateMany(
      {
        _id: { $in: ids },
        sender:userid,
      },
      {
        $set: { senderSaved:saved },
      }
    );

    await ChatMessageModel.updateMany(
      {
        _id: { $in: ids },
        reciever:userid
      },
      {
        $set: { recieverSaved:saved },
      }
    ); */
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.get("/getTokens", async (req, res) => {
  try {
    const tokens = await TokensModel.find();
    if (tokens) {
      res.json({
        status: 200,
        data: tokens,
      });
    } else {
      res.json({
        status: 400,
        data: null,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/newUser", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { walletId, walletName, token } = req.body;

    const exUser = await UserModel.findOne({
      walletName: walletName,
      walletAddress: walletId,
    });

    if (exUser) {
      exUser.fcmtoken = token;
      exUser.save();

      return res.json({
        status: 200,
        msg: "Success",
        user: exUser,
      });
    } else {
      let user;
      let address;
      if (walletId == null && walletName == "talki") {
        const web3 = new Web3("https://rpc.sepolia.org");
        const account = web3.eth.accounts.create();
        address=account.address;
        
        const pk=await functions.encryptor(account.privateKey,'talkiekey');

        user = await UserModel.create({
          username: "",
          firstname: "",
          lastname: "",
          image: "user.png",
          walletName: walletName,
          walletAddress: account.address,
          bio: "",
          fcmtoken: token,
          privatekeyToAccount: true,
          privateKey: pk,
        });
      } else {
        address=walletId;
        user = await UserModel.create({
          username: "",
          firstname: "",
          lastname: "",
          image: "user.png",
          walletName: walletName,
          walletAddress: walletId,
          bio: "",
          fcmtoken: token,
        });
      }

      await LedgerModel.create({
        userid: user._id,
        address: address?.toLowerCase(),
        tokenAddress: "talkix0000000000000000000000000000000000000000",
        balance: 0.0,
      });

      const userWallet = await UserWalletsModel.create({
        uid: user._id,
        walletAddress: address,
        walletName: walletName,
      });

      const resUser = user._doc;
      //delete resUser.privateKey;

      return res.json({
        status: 200,
        msg: "Success",
        user: resUser,
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.post("/addTransaction", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const {
      userid,
      walletAddress,
      tokenAddress,
      transactionType,
      amount,
      from,
      to,
      transactionHash,
      status,
      type,
    } = req.body;

    const transaction = await TransactionsModel.create({
      userid: userid,
      fromAddress: from,
      toAddress: to,
      tokenAddress: tokenAddress,
      transactionHash: transactionHash,
      status: status,
      type: type,
      transactionType: transactionType,
      amount: amount,
    });

    const ledger = await LedgerModel.findOne({
      userid: userid,
      address: from.toLowerCase(),
      tokenAddress: tokenAddress,
    });

    if (transactionType == "Deposit") {
      const newBalance = Number(ledger.balance) + Number(amount);
      ledger.balance = newBalance;
      ledger.save();
    } else {
      const newBalance = Number(ledger.balance) - Number(amount);
      ledger.balance = newBalance;
      ledger.save();

      
      const ledger2 = await LedgerModel.findOne({
        userid: walletAddress,
        address: to.toLowerCase(),
        tokenAddress: tokenAddress,
      });
      const newBalance2 = Number(ledger2.balance) + Number(amount);
      ledger2.balance = newBalance2;
      ledger2.save();
    }

    return res.json({
      status: 200,
      msg: "Success",
      transaction: transaction,
    });
  } catch (error) {
    console.log(error);
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.post("/addContact", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { userid, recieverid } = req.body;

    const usr = await UserModel.findOne({ _id: userid });
    const reciever = await UserModel.findOne({ _id: recieverid });

    let list = await UserListsModel.findOne({
      $or: [
        {
          user1: userid,
          user2: recieverid,
        },
        {
          user1: recieverid,
          user2: userid,
        },
      ],
    });

    if (!list) {
      list = await UserListsModel.create({
        user1: userid,
        user2: recieverid,
      });

      const finaluser = {
        _id: list._id,
        userid: usr._id,
        firstname: usr.firstname,
        lastname: usr.lastname,
        username: usr.username,
        image: usr.image,
        walletName: usr.walletName,
        walletAddress: usr.walletAddress,
        bio: usr.bio,
        fcmtoken: usr.fcmtoken,
        createdat: list.createdat,
        muted: false,
        archived: false,
        pinned: false,
        pinneOrder: 0,
      };

      io.to(recieverid).emit("adduser", finaluser);
    }

    return res.json({
      status: 200,
      msg: "Success",
      list: list,
      user: reciever,
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.get("/getUserLedger", async (req, res) => {
  try {
    const ledger = await LedgerModel.aggregate([
      {
        $match: {
          userid: req.query.id,
        },
      },
      {
        $lookup: {
          localField: "tokenAddress",
          from: "tokens",
          foreignField: "tokenAddress",
          as: "token",
        },
      },
    ]);

    let ledgerAccs=[];

    if (ledger) {
      forEachAsync(ledger, async function (la) {
        let price=0;
        if(la.balance>0){
          price = await functions.getUSDPrice(la.balance);
        }
        //console.log('price',price);
        const newObj = { ...la, usd: price };
        console.log(newObj);
        ledgerAccs.push(newObj);
      }).then(function () {
        res.json({
          status: 200,
          data: ledgerAccs,
        });
      });
    } else {
      res.json({
        status: 400,
        data: null,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/editUser/:id", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { id, username, firstname, lastname, bio } = req.body;

    const user = await UserModel.findOne({ _id: req.params.id });
    user.firstname = firstname;
    user.lastname = lastname;
    user.username = username;
    user.bio = bio;
    user.profileSetup = 1;
    user.save();

    return res.json({
      status: 200,
      msg: "Success",
      user: user,
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.post("/searchUser", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { id, term } = req.body;

    const allusers = await UserModel.find({
      walletAddress: { $regex: ".*" + term + ".*" },
      _id: { $ne: id },
    });

    if (allusers) {
      let users = [];
      forEachAsync(allusers, async function (user) {
        const finaluser = {
          _id: "newuser",
          userid: user._id,
          firstname: user.firstname,
          lastname: user.lastname,
          username: user.username,
          image: user.image,
          walletName: user.walletName,
          walletAddress: user.walletAddress,
          bio: user.bio,
          fcmtoken: user.fcmtoken,
          createdat: user.createdat,
        };

        users.push(finaluser);
      }).then(function () {
        res.json({
          status: 200,
          users: users,
        });
      });
    } else {
      res.json({
        status: 400,
        users: null,
      });
    }
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.get("/getUser", async (req, res) => {
  try {
    const user = await UserModel.findOne({ username: req.query.username });
    user.fcmtoken = req.query.token;
    user.save();
    if (user) {
      const balances = await LedgerModel.find({ userid: user.userid });
      let usr = { ...user._doc, balances };
      res.json({
        status: 200,
        data: usr,
      });
    } else {
      res.json({
        status: 400,
        data: null,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/getUserList", async (req, res) => {
  try {
    let totolUnread = 0;
    const currentUser = await UserModel.findOne({ _id: req.query.id });
    const userlist = await UserListsModel.find({
      $or: [
        {
          user1: req.query.id,
        },
        {
          user2: req.query.id,
        },
      ],
    }).sort({ createdat: -1 });

    if (userlist) {
      let users = [];
      let msgs = [];
      forEachAsync(userlist, async function (usr) {
        const uid = usr.user1 == currentUser._id ? usr.user2 : usr.user1;
        const notification = usr.user1 == currentUser._id ? usr.notificationsUser2 : usr.notificationsUser1;
        const blocked = usr.blockedUser1==true || usr.blockedUser2==true?true:false;
        const blockbyme= (usr.user1 == currentUser._id && usr.blockedUser1==true) || (usr.user2 == currentUser._id && usr.blockedUser2==true)?true:false;
        let user = await UserModel.findOne({ _id: uid });
        const archived = await ArchivedChatsModel.countDocuments({
          userid: currentUser._id,
          archived_userid: user._id,
        });
        const mutedcount = await MutedChatsModel.countDocuments({
          userid: currentUser._id,
          muted_userid: user._id,
        });
        const pinned = await PinnedChatsModel.findOne({
          userid: currentUser._id,
          pinned_userid: user._id,
        });

        const m = await ChatMessageModel.findOne({
          $or: [
            {
              sender: user._id,
              reciever: currentUser._id,
              recieverDeleted: false,
            },
            {
              reciever: user._id,
              sender: currentUser._id,
              senderDeleted: false,
            },
          ],
        }).sort({ createdat: -1 });

        if (m) {
          const msg = {
            _id: m._id,
            sender: m.sender,
            reciever: m.reciever,
            type: m.type,
            message: m.message,
            reply: m.reply,
            replyTo: m.replyTo,
            forwarded: m.forwarded,
            forwardedFrom: m.forwardedFrom || "",
            replyMsg: JSON.stringify(m.replyMsg) || "{}",
            seen: m.seen,
            edited: m.edited,
            senderDeleted: m.senderDeleted,
            recieverDeleted: m.recieverDeleted,
            senderPinned: m.senderPinned,
            recieverSaved: m.recieverSaved,
            senderSaved: m.senderSaved,
            recieverPinned: m.recieverPinned,
            createdat: m.createdat,
            seenat: m.seenat || "",
          };

          msgs.push(msg);
        }

        /* const unread = await ChatMessageModel.countDocuments({
          sender: user._id,
          reciever: currentUser._id,
          seen: false,
        });

        totolUnread += unread; */

        const muted = mutedcount == 0 ? false : true;
        const archive = archived == 0 ? false : true;
        /* if (archived == 0) {
          if (msg != null) {
            if (pinned) {
              const order = pinned.pinorder;
              const pinnedUser = true;
              user = { ...user._doc, msg, unread, muted, order, pinnedUser };
              pinnedusers.push(user);
            } else {
              user = { ...user._doc, msg, unread, muted };
              users.push(user);
            }
          }
        } else {
          user = { ...user._doc, msg, unread, muted };
          archivedusers.push(user);
        } */

        let pin = false;
        let pinOrder = 0;
        if (pinned) {
          pinOrder = pinned.pinorder;
          pin = true;
        }

        const finaluser = {
          _id: usr._id,
          userid: user._id,
          firstname: user.firstname,
          lastname: user.lastname,
          username: user.username,
          image: user.image,
          walletName: user.walletName,
          walletAddress: user.walletAddress,
          bio: user.bio,
          fcmtoken: user.fcmtoken,
          createdat: usr.createdat,
          muted: muted,
          archived: archive,
          pinned: pin,
          pinneOrder: pinOrder,
          notifications: notification==undefined?true:notification,
          blocked:blocked,
          blockbyme:blockbyme
        };

        users.push(finaluser);
      }).then(function () {
        //users.sort((a, b) => b.msg.createdat - a.msg.createdat);
        //pinnedusers.sort((a, b) => a.order - b.order);
        //const allusers = [...pinnedusers, ...users];

        res.json({
          status: 200,
          users: users,
          msgs: msgs,
        });
      });
    } else {
      res.json({
        status: 400,
        data: null,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/getUserStatus", async (req, res) => {
  try {
    const mystatus = await StatusModel.find({
      userid: req.query.id,
      expiredat: { $gte: moment.utc()},
    });

    const userlist = await UserListsModel.find({
      $or: [
        {
          user1: req.query.id,
        },
        {
          user2: req.query.id,
        },
      ],
      
    }).sort({ createdat: -1 });

    if (userlist) {
      let ouserstatus = [];
      forEachAsync(userlist, async function (usr) {
        const uid = usr.user1 == req.query.id ? usr.user2 : usr.user1;
        let user = await UserModel.findOne({ _id: uid });
        const status = await StatusModel.find({
          userid: user._id,
          expiredat: { $gte: moment.utc() },
        });
        if (status.length > 0) {
          ouserstatus.push(status);
        }
      }).then(function () {
        res.json({
          status: 200,
          userstatus: mystatus,
          otherstatus: ouserstatus,
        });
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/getUserListCall", async (req, res) => {
  try {
    const currentUser = await UserModel.findOne({ _id: req.query.id });
    const userlist = await UserListsModel.find({
      $or: [
        {
          user1: req.query.id,
        },
        {
          user2: req.query.id,
        },
      ],
    });

    if (userlist) {
      let users = [];
      forEachAsync(userlist, async function (usr) {
        const uid = usr.user1 == currentUser._id ? usr.user2 : usr.user1;
        let user = await UserModel.findOne({ _id: uid });
        user = { ...user._doc, usr };
        users.push(user);
      }).then(function () {
        res.json({
          status: 200,
          data: users,
        });
      });
    } else {
      res.json({
        status: 400,
        data: null,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/getSavedMessages", async (req, res) => {
  try {
    const msgs = await UserChatMessageModel.find({
      username: req.query.username,
    });
    if (msgs) {
      res.json({
        status: 200,
        data: msgs,
      });
    } else {
      res.json({
        status: 400,
        data: null,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/getChatHistory", async (req, res) => {
  try {
    const msgs = await ChatMessageModel.find({
      $or: [
        {
          sender: req.query.sender,
          reciever: req.query.reciever,
          senderDeleted: false,
        },
        {
          sender: req.query.reciever,
          reciever: req.query.sender,
          recieverDeleted: false,
        },
      ],
    }).sort({ createdat: 1 });
    const delmsgs = await ChatMessageModel.find({
      $or: [
        {
          sender: req.query.sender,
          reciever: req.query.reciever,
          senderDeleted: true,
        },
        {
          sender: req.query.reciever,
          reciever: req.query.sender,
          recieverDeleted: true,
        },
      ],
    });
    /* const msgs = await ChatMessageModel.find({
      $or: [
        {
          sender: req.query.sender,
          reciever: req.query.reciever,
          senderDeleted: false
        },
        {
          sender: req.query.reciever,
          reciever: req.query.sender,
          recieverDeleted: false
        },
      ],
    }).sort({ createdat: 1 });

    const pinnedmsgs = await ChatMessageModel.find({
      $or: [
        {
          sender: req.query.sender,
          reciever: req.query.reciever,
          senderPinned: true
        },
        {
          sender: req.query.reciever,
          reciever: req.query.sender,
          recieverPinned: true
        },
      ],
    }).sort({ createdat: 1 }); */

    if (msgs) {
      res.json({
        status: 200,
        data: msgs,
        delmsgs: delmsgs,
        //pinned: pinnedmsgs
      });
    } else {
      res.json({
        status: 400,
        data: null,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/markChatHistory", async (req, res) => {
  try {
    ChatMessageModel.updateMany(
      {
        sender: req.query.sender,
        reciever: req.query.reciever,
      },
      {
        $set: { seen: true, seenat: moment.utc() },
      }
    ).then(() => {
      res.json({
        status: 200,
        msg: "done",
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/newStatus", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { id, type, status } = req.body;

    const fileName = uuidv4() + ".jpg"; // Generate unique filename
    const filePath = path.join(__dirname, "uploads", fileName);

    fs.writeFile(filePath, status, "base64", (err) => {
      if (err) throw err;
      //io.emit("image", fileName); // Broadcast image filename to all connected clients
    });

    const newStatus = await StatusModel.create({
      userid: id,
      status: fileName,
      type: type,
      createdat: moment.utc(),
    });

    return res.json({
      status: 200,
      msg: "Success",
      status: newStatus,
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.get("/markStatus", async (req, res) => {
  try {
    StatusViewModel.create({
      statusid: req.query.statusid,
      userid: req.query.userid,
      createdat: moment.utc(),
    }).then(() => {
      res.json({
        status: 200,
        msg: "done",
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/userNotification", async (req, res) => {
  try {
    await UserListsModel.updateOne(
      {
        user1:req.query.id
      },
      {
        $set: { notificationsUser1: req.query.notification },
      }
    );

    await UserListsModel.updateOne(
      {
        user2:req.query.id
      },
      {
        $set: { notificationsUser2: req.query.notification },
      }
    );


    res.json({
      status: 200,
      msg: "done",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/deleteStatus", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { id } = req.body;

    await StatusModel.deleteOne({_id:id});
    return res.json({
      status: 200,
      msg: "Success",
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.get("/getStickers", async (req, res) => {
  try {
    const stickers = await StickersModel.find();
    res.json({
      status: 200,
      data: stickers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/muteChat", async (req, res) => {
  try {
    const muted = await MutedChatsModel.countDocuments({
      userid: req.query.userid,
      muted_userid: req.query.muteduserid,
    });

    if (muted == 0) {
      MutedChatsModel.create({
        userid: req.query.userid,
        muted_userid: req.query.muteduserid,
        createdat: moment.utc(),
      }).then(() => {
        res.json({
          status: 200,
          msg: "Done",
        });
      });
    } else {
      await MutedChatsModel.deleteMany({
        userid: req.query.userid,
        muted_userid: req.query.muteduserid,
      }).then(() => {
        res.json({
          status: 200,
          msg: "Done",
        });
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/archiveChat", async (req, res) => {
  try {
    ArchivedChatsModel.create({
      userid: req.query.userid,
      archived_userid: req.query.archiveuserid,
      createdat: moment.utc(),
    }).then(() => {
      res.json({
        status: 200,
        msg: "Done",
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/unarchiveChat", async (req, res) => {
  try {
    ArchivedChatsModel.deleteMany({
      userid: req.query.userid,
      archived_userid: req.query.archiveuserid,
    }).then(() => {
      res.json({
        status: 200,
        msg: "Done",
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/deleteChat", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { user, otheruser, type } = req.body;

    if (type == 2) {
      await ChatMessageModel.updateMany(
        {
          $or: [
            {
              sender: user,
              reciever: otheruser,
            },
          ],
        },
        {
          $set: { senderDeleted: true },
        }
      );

      await ChatMessageModel.updateMany(
        {
          $or: [
            {
              reciever: user,
              sender: otheruser,
            },
          ],
        },
        {
          $set: { recieverDeleted: true },
        }
      );
    } else {
      await ChatMessageModel.deleteMany({
        $or: [
          {
            reciever: user,
            sender: otheruser,
          },
          {
            sender: user,
            reciever: otheruser,
          },
        ],
      });
      io.to(otheruser).emit("deletechat", user);
    }

    return res.json({
      status: 200,
      msg: "Success",
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.post("/deleteChatMessage", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { user, ids, type } = req.body;

    if (type == 1) {
      await ChatMessageModel.deleteMany({
        _id: { $in: ids },
      });

      io.emit("deletemessages", ids);
    } else {
      await ChatMessageModel.updateMany(
        {
          _id: { $in: ids },
          sender: user,
        },
        {
          $set: { senderDeleted: true },
        }
      );

      await ChatMessageModel.updateMany(
        {
          _id: { $in: ids },
          reciever: user,
        },
        {
          $set: { recieverDeleted: true },
        }
      );
    }

    return res.json({
      status: 200,
      msg: "Success",
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.get("/pinChat", async (req, res) => {
  try {
    const pinned = await PinnedChatsModel.countDocuments({
      userid: req.query.userid,
      pinned_userid: req.query.pinneduserid,
    });

    if (pinned == 0) {
      PinnedChatsModel.create({
        userid: req.query.userid,
        pinned_userid: req.query.pinneduserid,
      }).then(() => {
        res.json({
          status: 200,
          msg: "Done",
        });
      });
    } else {
      await PinnedChatsModel.deleteMany({
        userid: req.query.userid,
        pinned_userid: req.query.pinneduserid,
      }).then(() => {
        res.json({
          status: 200,
          msg: "Done",
        });
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/pinChatMessage", async (req, res) => {
  try {
    const msg = await ChatMessageModel.findOne({ _id: req.query.id });
    const otherId = req.query.userid == msg.sender ? msg.reciever : msg.sender;
    const pinned =
      req.query.userid == msg.sender ? msg.senderPinned : msg.recieverPinned;
    if (req.query.type == 1) {
      msg.senderPinned = !pinned;
    } else if (req.query.type == 2) {
      msg.recieverPinned = !pinned;
    } else {
      msg.senderPinned = !pinned;
      msg.recieverPinned = !pinned;
      io.to(otherId).emit("pinnedMessage", req.query.id, !pinned);
    }
    msg.save();

    res.json({
      status: 200,
      msg: "Done",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/getCallHistory", async (req, res) => {
  try {
    const currentUser = await UserModel.findOne({ _id: req.query.id });
    const calls = await CallHistoryModel.find({
      $or: [
        {
          sender: req.query.id,
        },
        {
          reciever: req.query.id,
        },
      ],
    });

    if (calls) {
      res.json({
        status: 200,
        data: calls,
      });
    } else {
      res.json({
        status: 400,
        data: null,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/blockUser", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { id, blockid, blocked } = req.body;

    const list = await UserListsModel.findOne({
      $or: [
        {
          user1: id,
          user2: blockid,
        },
        {
          user1: blockid,
          user2: id,
        },
      ],
    });

    if(list.user1==id){
      list.blockedUser1= blocked;
    }else if(list.user2==id){
      list.blockedUser2= blocked;
    }
    list.save();

    io.to(blockid).emit("blockedUser",list._id, blocked);

    return res.json({
      status: 200,
      msg: "Success",
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.post("/checkUserAccount", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { username,privateKey } = req.body;

    const user = await UserModel.findOne({username:username});
    
    const originalKey=await functions.decryptor(user.privateKey,'talkiekey');
    
    if(privateKey==originalKey){
      return res.json({
        status: 200,
        user: user,
      });
    }else{
      return res.json({
        status: 400,
        msg: "error",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.post("/setShowNotifications", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { id,notifications } = req.body;

    const user = await UserModel.findByIdAndUpdate(id,{notifications:notifications},{new: true});

    return res.json({
      status: 200,
      user: user,
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.post("/setMessagePreview", async (req, res) => {
  if (req.method != "POST") return res.status(400);
  try {
    const { id,messagePreview } = req.body;
    const user = await UserModel.findByIdAndUpdate(id,{messagePreview:messagePreview},{new: true});

    return res.json({
      status: 200,
      user: user,
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Internal server error",
    });
  }
});

app.get("/testMsg", async (req, res) => {
  try {
    const registrationToken =
      "ccfo6YZdT66lA9mgBXKUSY:APA91bHvrfaPKi0sspo2Nl4mxsbONFhuoatz8jKkEKC2p_IqwvjMsskQWkDcbV5hPRL5ZwuBk57TLLdGYfQ8BgGdn8I49ZauqdR5Ra_Y7T7IH3b3vSwyENEGLgDUdB-A-5gfAH1w5ypU";
    const message = {
      data: {
        score: "850",
        time: "2:45",
      },
      token: registrationToken,
      android: {
        ttl: 604800, // 7 days in seconds
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
        headers: {
          "apns-push-type": "background",
          "apns-priority": "5",
          "apns-topic": "com.my.app.app", // your app bundle identifier
        },
      },
    };
    admin.messaging().send(message);

    res.json({
      status: 200,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

server.listen(PORT, () => {
  console.log("Server is running PORT:", PORT);
});
