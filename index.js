const { v4: uuidv4 } = require('uuid');
const express = require('express');
const webpush = require('web-push');
var cors = require('cors');
require('dotenv').config()


const publicVapidKey = process.env.PUBLIC_KEY;
const privateVapidKey = process.env.PRIVATE_KEY;

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

// Replace with your email
webpush.setVapidDetails('mailto:'+process.env.EMAIL, publicVapidKey, privateVapidKey);

const app = express();

app.use(cors());
app.options('*', cors());  // enable pre-flight
app.use(require('body-parser').json());

app.post('/unsubscribe', (req, res) => {
  // find user and delete with sub key
  const app_name = req.body.app_name;
  const email = req.body.email;
  const device_code = req.body.device_code;

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db('notification_master');
    var myobj = { email: email, app_name: app_name, device_id: device_code};
    
    dbo.collection('subscriptions').deleteOne(myobj, function(err, result) {
      if (err) throw err;
      db.close();
    });
  });

  res.status(201).json({});

});

app.post('/subscribe', (req, res) => {
  const subscription = req.body.subscription;
  const app_name = req.body.app_name;
  const email = req.body.email;
  const device_code = req.body.device_id;

  MongoClient.connect(url, function(err, db) {
    //check if user exists and add them
    if (err) throw err;
    var dbo = db.db('notification_master');
    dbo.collection('subscriptions').findOne({"email": email}, function(err, res) {
      if (err) throw err;

      console.log(res);

      // if (res.length() > 0) {
      //   var id = uuidv4();
      //   var myobj = {key: res['subscription'], app_name: app_name, device_id: device_code, subscription: subscription};
      //   dbo.collection('subscriptions').insertOne(myobj, function(err, res) {
      //     if (err) throw err;
      //     db.close();
      //   });

      // } else {
      //   var id = uuidv4();
      //   var myobj = {key: id, app_name: app_name, device_id: device_code, subscription: subscription};
      //   dbo.collection('subscriptions').insertOne(myobj, function(err, res) {
      //     if (err) throw err;

      //     MongoClient.connect(url, function(err, db) {
      //       if (err) throw err;
      //       var dbo = db.db('notification_master');
      //       var myobj = { email: email, app_name: app_name, subscription: id};
      //       dbo.collection('users').insertOne(myobj, function(err, res) {
      //         if (err) throw err;
      //         db.close();
      //       });
      //     });
      //     db.close();
      //   });
      // }
      
    });
    
  });

  res.status(201).json({});
  const payload = JSON.stringify({ title: app_name, body: 'Test notification!', icon: '' });

  webpush.sendNotification(subscription, payload).catch(error => {
    console.error(error.stack);
  });
});

app.post('/send', (req, res) => {
  const app_name = req.body.app_name;
  const email = req.body.email;

  const title = req.body.title;
  const body = req.body.body;
  const icon = req.body.icon;

  const payload = JSON.stringify({ title: title, body: body, icon: icon});

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db('notification_master');
    var query = { email: email, app_name: app_name };
    dbo.collection('users').find(query).toArray(function(err, result) {
      if (err) throw err;
      
      for (let i = 0; i < result.length; i++) {
        MongoClient.connect(url, function(err, db) {
          if (err) throw err;
          var dbo = db.db('notification_master');
          var query = { key: result[i]['subscription'] };
          dbo.collection('subscriptions').find(query).toArray(function(err, res) {
            if (err) throw err;
            
            for (let j = 0; j < res.length; j++) {
              let my_sub = res[j]['subscription'];

              webpush.sendNotification(my_sub, payload).catch(error => {
                console.error(error.stack);
              });
            }

            db.close();
          }); 
        });
      } 

      db.close();
    });
  });

  res.status(201).json({});
});

app.post('/sendall', (req, res) => {
  const app_name = req.body.app_name;

  const title = req.body.title;
  const body = req.body.body;
  const icon = req.body.icon;

  const payload = JSON.stringify({ title: title, body: body, icon: icon});

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db('notification_master');
    var query = { app_name: app_name };
    dbo.collection('users').find(query).toArray(function(err, result) {
      if (err) throw err;
      console.log(result);
      
      for (let i = 0; i < result.length; i++) {
        MongoClient.connect(url, function(err, db) {
          if (err) throw err;
          var dbo = db.db('notification_master');
          var query = { key: result[i]['subscription'] };
          dbo.collection('subscriptions').find(query).toArray(function(err, res) {
            if (err) throw err;
            
            for (let j = 0; j < res.length; j++) {
              let my_sub = res[j]['subscription'];

              webpush.sendNotification(my_sub, payload).catch(error => {
                console.error(error.stack);
              });
            }

            db.close();
          }); 
        });
      } 

      db.close();
    });
  });

  res.status(201).json({});
});

app.use(require('express-static')('./'));

app.listen(3000);
