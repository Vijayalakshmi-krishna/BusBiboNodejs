const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoClient = require('mongodb');
const url = "mongodb://localhost:27017"
// const bcrypt = require('bcrypt');
// const saltrounds = 10;
// const jwt = require('jsonwebtoken');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


//function to authenticate the user with valid JWT token
// function authenticate(req, res, next) {
//     let header = req.header('Authorization')

//     if (header == undefined) {
//         res.status(401).json({
//             message: "unauthorized"
//         });
//     }
//     else {
//         //Allow users with valid token
//         var decode = jwt.verify(header, 'abcghimno');
//         next();
//     }

// }
//New users Route

app.post("/login", function (req, res) {
    console.log(req.body)

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        db.collection("users").findOne({ email: req.body.email }, function (err, userData) {
            if (err) throw err;
            console.log(userData)
            //compare the password and generate jwt token

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
            if (userData.password == req.body.password) {
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

app.post("/login/register", function (req, res) {
    console.log(req.body);
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var minm = 1000;
        var maxm = 9999;
        var uniqueId = req.body.type + Math.floor(Math.random() * (maxm - minm + 1) + minm);

        //  console.log(random_string);        
        var newData = {
            type: req.body.type,
            dob: req.body.dob,
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            uniqueId: uniqueId,
            password: req.body.password
        }


        db.collection("users").updateOne(
            { email: req.body.email }, {
            $setOnInsert: {
                type: req.body.type,
                dob: req.body.dob,
                name: req.body.name,
                phone: req.body.phone,
                uniqueId: uniqueId,
                password: req.body.password
            }
        },
            { upsert: true }, function (err, data) {
                if (err) throw err;
                // console.log(data.upsertedCount);
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

app.post('/searchbuses', function (req, res) {
    console.log(req.body)

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var busresults = db.collection("busData").find({ source: req.body.source, destination: req.body.destination, departDate: req.body.departDate }).toArray();
        busresults.then(function (data) {
            console.log(data);
            console.log("buses displayed");
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

    console.log("Edit Seats:")
    console.log(req.params.busNum);
    console.log(req.params.avlSeats)
    console.log(req.body);
    var blockedSeats = req.body;
    var bal_seats;
    // var bookedSeats=blockedSeats.length;
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
    console.log(updateSeats)

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        //var ObjectId = require('mongodb').ObjectID;
        db.collection("busData").updateOne({ busNum: req.params.busNum },
            { $set: { seatstatus: updateSeats, avlSeats: bal_seats } }, function (err, result) {
                if (err) throw err;
                console.log("Seats Updated");

                client.close();
                res.json({
                    result: result,
                    message: "Seats Updated"
                })
            });

    });
});

app.get('/seatstatus/:busnum', function (req, res) {
    console.log(req.params.busnum)

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var busData = db.collection("busData").findOne({ busNum: req.params.busnum });
        busData.then(function (data) {
            console.log(data);
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

    console.log(req.body);
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        db.collection("busData").insertOne((req.body), function (err, result) {
            if (err) throw err;
            console.log("Bus data added in DB");
            client.close();
            res.send({
                result: result,
                message: 'Bus Data Added'
            });
        });
    });

});



app.put('/editbus/:id', function (req, res) {

    console.log(req.params.id);
    console.log(req.body);
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        db.collection("busData").updateOne({ busNum: req.params.id },
            { $set: { source: req.body.source, destination: req.body.destination, departDate: req.body.departDate, departTime: req.body.departTime, arrivalDate: req.body.arrivalDate, arrivalTime: req.body.arrivalTime } }, function (err, result) {
                if (err) throw err;
                console.log("updated to db");

                client.close();
                res.json({
                    message: "Updated to DB"
                })
            });

    });
});


app.get('/buslist', function (req, res) {
    console.log(req.body)

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var busresults = db.collection("busData").find().toArray();
        busresults.then(function (data) {
            console.log(data);
            console.log("buses displayed");
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

    
    console.log(req.body);
    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        db.collection("ticketData").insertOne((req.body), function (err, result) {
            if (err) throw err;
            console.log("Ticket data added in DB");
            client.close();
            res.send({
                result: result,
                message: 'Bus Data Added'
            });
        });
    });

});


app.get('/listtickets/:email', function (req, res) {
    console.log(req.params.email)

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var Ticketresults = db.collection("ticketData").find({userEmail:req.params.email}).toArray();
        Ticketresults.then(function (data) {
            console.log(data);
            console.log("Tickets displayed");
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
    console.log(req.params.ticketId)

    mongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
        if (err) throw err;
        var db = client.db("busbookdb");
        var TicketData = db.collection("ticketData").findOne({ ticketId: req.params.ticketId });
        TicketData.then(function (data) {
            console.log(data);
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




app.listen(3000, function () {
    console.log("Port is running in 3000...")
})