const mongoose = require("mongoose");
const data = require("./data.js");
const Listing = require("../models/listings.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to DB");
}

const initDB = async () => {
    await Listing.deleteMany({});
    await Listing.insertMany(data.data);
    console.log("Data was initialized");
};

main()
    .then(async () => {
        await initDB();
        await mongoose.connection.close();
        console.log("Database connection closed");
    })
    .catch((err) => {
        console.log(err);
    });