const express = require("express");
const multiparty = require("multiparty");
const mongodb = require("mongodb");
const expressWs = require("express-ws");
const session = require("express-session")
const {mongo_uri, cookieSecret} = require(__dirname + "/credentials.json");
const app = express();
const port = 8080;

const {UserModel, DataModel} = require("./models/mainModel")

app.use(express.static(__dirname + '/public'));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/main.html");
});

//need to add input sanitization 
app.route("/signup")
    .get((req, res) => {
        // TODO
        res.render("signup.njk", {browsertitle: "Sign Up"});
    })
    .post((req, res) => {
        console.log("THIS IS REQ BODY", req.body)
        if(req.body.email === req.body.confirmedemail){
            if(req.body.password === req.body.confirmedpassword){
                console.log("Confirmed!")
                UserModel.register(req.body.email, req.body.password)
                //create session here
                req.session.regenerate( function () {
                    req.session.email = req.body.email;
                })

                res.redirect("/subpage")
            } else {
                console.log("Failed Email or Password")
                res.render("/public/signup.html", {browsertitle: "Sign Up"})
            }
        }  else {
            console.log("Failed Email or Password")
            res.render("/public/signup.html", {browsertitle: "Sign Up"})
        }
    })

//need to add incorrect email or password on login attempt 
app.post("/loginHandler", async (req, res) => {
    let bool = await UserModel.saltedAuthenticate(req.body.email, req.body.password);
    if( bool ) {
        req.session.regenerate( function () {
            req.session.email = req.body.email;
        })
        console.log(req.body);
        res.send(req.body);
    }
    
});

//Form Handling
app.route("/formHandler")
    .get((req, res) => {
        console.log("Form Data: ", req.body);
        res.render("/public/post_main.html", {filter:"none"})
    })
    .post((req, res) => {
        let response = "";
        let form = new multiparty.Form({autofields: true});

        //subscribe field listener
        //any field (input data type that isnt a file) in the form response is validated with list of valid names 
        form.on("field", (name, value) => {
            //check if the parsed field matches any of the fields we expect
            Object.keys(validFields).forEach((valid_name) => {
                if (valid_name === name) {
                    validFields[valid_name] = value;
                } else {
                    console.log("Invalid Field or Data Entry.");
                    res.render("/public/signup.html", {browsertitle: "Sign Up"})
                }
            })
        })

        //after the form is closed, send response to client
        form.on("close", () => {
            res.send(response);
        });

        form.parse(req);
        console.log("Successfully Placed in the Cloud")
        res.render("/public/data_collection.html", {browsertitle: "Golden Circles Community Centre"})
    
    });

app.listen(port, () =>{
    console.log(`listening on http://localhost:${port}`);
});