const mongoose = require("mongoose");
const {admin_password} = require("../credentials.json")
const hash = require("pbkdf2-password")();
//need to create data schema
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    hash: {
        type: String,
        required: true
    },
    salt: {
        type: String,
        required: true
    }
}, {
    statics: {
        // Authenticate the user
        async authenticate(email, pw) {
            let doc = await this.findOne({
                email: email
            })
            if(doc) {
                console.log("Found entry");
                if (pw === doc.password) {
                    return true
                } else {
                    console.log("Password did not match")
                    return false
                }
            } else {
                console.log("No user found")
                return false
            }
        },
        async register(email, password) {
            hash({password: password}, async (err, pass, salt, hash) => {
                if(err) throw err;
                let newUser = new this({
                    email: email,
                    hash: hash,
                    salt: salt
                })
                await newUser.save()
            })
        },
        async saltedAuthenticate(user, pw) {
            let doc = await this.findOne({
                user: user
            })

            return new Promise((resolve, reject) => {
                if(doc) {
                    console.log("Found entry")
                    console.log("Salt found ", doc.salt)
                    hash({password: pw, salt: doc.salt}, (err, pass, salt, hash) => {
                        if (err) throw err;
                        if (hash === doc.hash) {
                            console.log("Matched")
                            resolve(true)
                        } else {
                            console.log("Password did not match")
                            resolve(false)
                        }
                    })
                }
                else {
                    console.log("No user found")
                    resolve(false)
                }
            })
        }
    }
})
const UserModel = mongoose.model("User", userSchema)

const dataSchema = new mongoose.Schema({
    blood_pressure: {
        type: String,
        required: true
    },
    ekg_reading: {
        type: String,
        required: true
    },
    avg_heartrate: {
        type: String,
        required: true
    }
})

const DataModel = mongoose.model("HealthData", dataSchema)

//Puts users into database
async function seedUserCollection(connectionString) {
    let hashedUser = new UserModel({
        user: "admin",
        hash: "",
        salt: ""
    })

    hash({password: admin_password}, (err, pass, salt, hashed) => {
        if (err) throw err;
        hashedUser.hash = hashed
        hashedUser.salt = salt
    })

    let fullConnection = `${connectionString}/Website` 
    console.log("USERS: " + fullConnection)
    await mongoose.connect(fullConnection).catch(console.log)


    let result
    return result = await hashedUser.save()
}



module.exports = {
    seedUserCollection: seedUserCollection,
    UserModel: UserModel
}