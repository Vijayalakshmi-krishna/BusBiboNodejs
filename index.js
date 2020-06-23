const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoClient = require('mongodb');
//const url = "mongodb://localhost:27017"
const url = "mongodb+srv://admin:passw0rd@mongo-productcatalog-roxs3.mongodb.net/busbookdb?retryWrites=true&w=majority"
const bcrypt = require('bcrypt');
const saltrounds = 10;
//const port=3000;
const port = process.env.PORT;

//app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "https://bus-zone.herokuapp.com");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    next();
  });

app.post("/login", function (req, res) {
    

    var loginType =
    {
        $or: [{ email: req.body.email }, { phone: req.body.phone }, { uniqueId: req.body.uniqueId }]
    }

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        db.collection("users").findOne(loginType, function (err, userData) {
            if (err) throw err;
            
            //compare the password and generate jwt token
            bcrypt.compare(req.body.password, userData.password, function (err, result) {

                if (result) {

                    var type;
                    if (userData.type == 'P') {
                        type = "Passenger"
                    }
                    else if (userData.type == 'B') {
                        type = "Bus Operator"
                    }
                    else if (userData.type == 'A') {
                        type = "Admin"
                    }

                    res.json({
                        result: userData,
                        message: "successfully Logged in as " + type
                    })
                }

                else {
                    res.json({
                        message: "Login Failed",
                    })
                }

               
            })

        })
    })
})

app.post("/login/register", function (req, res) {
    
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var minm = 1000;
        var maxm = 9999;
        var uniqueId = req.body.type + Math.floor(Math.random() * (maxm - minm + 1) + minm);   
             
        var newData = {
            type: req.body.type,
            dob: req.body.dob,
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            uniqueId: uniqueId
            // password: req.body.password
        }

        bcrypt.genSalt(saltrounds, function (err, salt) {
            if (err) throw err;
            bcrypt.hash(req.body.password, salt, function (err, hash) {

                if (err) throw err;
                newData.password = hash;

                db.collection("users").updateOne(
                    { email: req.body.email }, {
                    $setOnInsert: {
                        type: req.body.type,
                        dob: req.body.dob,
                        name: req.body.name,
                        phone: req.body.phone,
                        uniqueId: uniqueId,
                        password: newData.password
                    }
                },
                    { upsert: true }, function (err, data) {
                        if (err) throw err;
                       
                        if (data.upsertedCount > 0) {
                            client.close();
                            res.json(newData)
                        }
                        else {
                            var userData = db.collection("users").findOne({ email: req.body.email });
                            userData.then(function (result) {

                                client.close();
                                res.json({
                                    Message: "Email Already exists",
                                    result: result
                                });
                            })
                                .catch(function (err) {
                                    client.close();
                                    res.json({
                                        message: "Data not retrieved"
                                    })
                                });


                        }

                    });
            })
        })


    })
})

app.put('/edituser/:email', function (req, res) {

    
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        db.collection("users").updateOne({ email: req.params.email },
            { $set: { dob: req.body.dob,name:req.body.name, phone: req.body.phone} }, function (err, result) {
                if (err) throw err;

                client.close();
                res.json({
                    result:result,
                    message: "Updated to DB"
                })
            });

    });
});


app.post('/searchbuses', function (req, res) {
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var busresults = db.collection("busData").find({ source: req.body.source, destination: req.body.destination, departDate: req.body.departDate }).toArray();
        busresults.then(function (data) {
            
            client.close();
            res.json(data);
        })
            .catch(function (err) {
                client.close();
                res.json({
                    message: "error"
                })
            });
    });
});

app.put('/editSeats/:busNum/:avlSeats', function (req, res) {

    
    
    var blockedSeats = req.body;
    var bal_seats;
    
    if (blockedSeats.length == 12) {
        bal_seats = 0
    }
    else {
        bal_seats = 12 - blockedSeats.length
    }

    var updateSeats = {
        s1: blockedSeats.includes('s1') ? true : false,
        s2: blockedSeats.includes('s2') ? true : false,
        s3: blockedSeats.includes('s3') ? true : false,
        s4: blockedSeats.includes('s4') ? true : false,
        s5: blockedSeats.includes('s5') ? true : false,
        s6: blockedSeats.includes('s6') ? true : false,
        s7: blockedSeats.includes('s7') ? true : false,
        s8: blockedSeats.includes('s8') ? true : false,
        s9: blockedSeats.includes('s9') ? true : false,
        s10: blockedSeats.includes('s10') ? true : false,
        s11: blockedSeats.includes('s11') ? true : false,
        s12: blockedSeats.includes('s12') ? true : false
    }
       

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        //var ObjectId = require('mongodb').ObjectID;
        db.collection("busData").updateOne({ busNum: req.params.busNum },
            { $set: { seatstatus: updateSeats, avlSeats: bal_seats } }, function (err, result) {
                if (err) throw err;
                
                client.close();
                res.json({
                    result: result,
                    message: "Seats Updated"
                })
            });

    });
});

app.get('/seatstatus/:busnum', function (req, res) {
       

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var busData = db.collection("busData").findOne({ busNum: req.params.busnum });
        busData.then(function (data) {
            
            client.close();
            res.json(data);
        })
            .catch(function (err) {
                client.close();
                res.json({
                    message: "error"
                })
            });
    });
});

app.post('/addbus', function (req, res) {

    
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        db.collection("busData").insertOne((req.body), function (err, result) {
            if (err) throw err;           
            client.close();
            res.send({
                result: result,
                message: 'Bus Data Added'
            });
        });
    });

});



app.put('/editbus/:id', function (req, res) {

    
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        db.collection("busData").updateOne({ busNum: req.params.id },
            { $set: { source: req.body.source, destination: req.body.destination, departDate: req.body.departDate, departTime: req.body.departTime, arrivalDate: req.body.arrivalDate, arrivalTime: req.body.arrivalTime } }, function (err, result) {
                if (err) throw err;
               
                client.close();
                res.json({
                    message: "Updated to DB"
                })
            });

    });
});


app.get('/buslist', function (req, res) {
    

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var busresults = db.collection("busData").find().toArray();
        busresults.then(function (data) {         
            
            client.close();
            res.json(data);
        })
            .catch(function (err) {
                client.close();
                res.json({
                    message: "error"
                })
            });
    });
});

app.post('/addticket', function (req, res) {


    
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        db.collection("ticketData").insertOne((req.body), function (err, result) {
            if (err) throw err;         
            
            client.close();
            res.send({
                result: result,
                message: 'Bus Data Added'
            });
        });
    });

});


app.get('/listtickets/:email', function (req, res) {    

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var Ticketresults = db.collection("ticketData").find({ userEmail: req.params.email }).toArray();
        Ticketresults.then(function (data) {
           
            client.close();
            res.json(data);
        })
            .catch(function (err) {
                client.close();
                res.json({
                    message: "error"
                })
            });
    });
});


app.get('/viewticket/:ticketId', function (req, res) {    

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var TicketData = db.collection("ticketData").findOne({ ticketId: req.params.ticketId });
        TicketData.then(function (data) {
            
            client.close();
            res.json(data);
        })
            .catch(function (err) {
                client.close();
                res.json({
                    message: "error"
                })
            });
    });
});

app.put('/cancelticket/:ticketId', function (req, res) {

    
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        db.collection("ticketData").updateOne({ ticketId: req.params.ticketId },
            { $set: { status: "Cancelled" } }, function (err, result) {
                if (err) throw err;            

                client.close();
                res.json({
                    message: "Updated to DB"
                })
            });

    });
});

app.put('/freeseats/:busNum/:freeseats', function (req, res) {

   
   
    var freeSeats=req.params.freeseats.split(',')    
    var blockedSeats=req.body;
    var bal_seats;
    freeSeats.forEach((item)=>{
        if (blockedSeats.includes(item))
        {
            var index=blockedSeats.indexOf(item);
            blockedSeats.splice(index,1)
        }
    })   

    if (blockedSeats.length == 12) {
        bal_seats = 0
    }
    else {
        bal_seats = 12 - blockedSeats.length
    }

    
    
    var updateSeats = {
        s1: blockedSeats.includes('s1') ? true : false,
        s2: blockedSeats.includes('s2') ? true : false,
        s3: blockedSeats.includes('s3') ? true : false,
        s4: blockedSeats.includes('s4') ? true : false,
        s5: blockedSeats.includes('s5') ? true : false,
        s6: blockedSeats.includes('s6') ? true : false,
        s7: blockedSeats.includes('s7') ? true : false,
        s8: blockedSeats.includes('s8') ? true : false,
        s9: blockedSeats.includes('s9') ? true : false,
        s10: blockedSeats.includes('s10') ? true : false,
        s11: blockedSeats.includes('s11') ? true : false,
        s12: blockedSeats.includes('s12') ? true : false
    }

    

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        //var ObjectId = require('mongodb').ObjectID;
        db.collection("busData").updateOne({ busNum: req.params.busNum },
            { $set: { seatstatus: updateSeats, avlSeats: bal_seats}}, function (err, result) {
                if (err) throw err;               

                client.close();
                res.json({
                    result: result,
                    message: "Cancelled"
                })
            });

    });
});


app.listen(port, function () {
    console.log("Port is running in ...",port)
})