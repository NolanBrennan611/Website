const express = require("express");
const multiparty = require("multiparty");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const expressWs = require("express-ws");
const session = require("express-session")
const {mongo_uri, cookieSecret} = require(__dirname + "/credentials.json");
const app = express();
const port = 3000;

const {UserModel, DataModel} = require("./models/mainModel")

app.use(session({
    secret: cookieSecret
}))

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
                console.log("Failed Password")
                res.render("views/signup.njk", {browsertitle: "Sign Up"})
            }
        }  else {
            console.log("Failed Email")
            res.render("views/signup.njk", {browsertitle: "Sign Up"})
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
    } else {
        console.log("password didnt match")
    }
    
});

//Form Handling
app.route("/formHandler")
    .get((req, res) => {
        console.log("Form Data: ", req.body);
        res.render("subpage", {filter:"none"})
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
                    res.render("views/signup.njk", {browsertitle: "Sign Up"})
                }
            })
        })

        //a part is any form entry that is a file
        form.on("part", (part) => {
            console.log(part);
            if(part.headers["content-type"] !== "application/octet-stream") { //if they submitted nothing, no point in continuing
                if(part.headers["content-type"] !== "image/jpeg"){            //if it is not jpeg, it must be png
                    if(part.headers["content-type"] !== "image/png"){         //if it is not a png, send that it is invalid.
                        res.status(418);
                        response = "invalid file type";
                        //tells the parser to continue without reading out this part
                        part.resume();
                        return
                    }
                }
            }

            //make sure that part is of valid name
            if(part.name !== "product_image"){
                //tells part to continue
                part.resume();
                return
            }

            //3mb max image
            if(part.byteCount > 3000000){
                part.resume();
                //update response for final return
                response = "File too large";
                return
            } else if (part.byteCount === 0) {
                part.resume();
            }

            //good case
            //pipe file to server directory with given file name
            part.pipe(fs.createWriteStream(path.join("./public/uploaded-review-images", part.filename)))
            response = `File with name ${part.filename} saved`;
            
        });

        //after the form is closed, send response to client
        form.on("close", () => {
            res.send(response);
        });

        form.parse(req);
        console.log("Successfully Placed in the Cloud")
        res.render("views/main.njk", {browsertitle: "Golden Circles Community Centre"})
    });

app.listen(port, () =>{
    console.log(`listening on http://localhost:${port}`);
});