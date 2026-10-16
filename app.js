const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listings.js");
const Review = require("./models/review.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const { listingSchema } = require("./schema.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

// ===============================
// MongoDB Connection
// ===============================
main()
    .then(() => console.log("Connected to DB"))
    .catch((err) => console.log(err));

async function main() {
    await mongoose.connect(MONGO_URL);
}

// ===============================
// Helpers
// ===============================
class ExpressError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function wrapAsync(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(next);
    };
}

// Validates form data with Joi before it reaches the database
function validateListing(req, res, next) {
    const { error } = listingSchema.validate(req.body);
    if (error) {
        const msg = error.details.map((el) => el.message).join(", ");
        throw new ExpressError(400, msg);
    }
    next();
}

// ===============================
// EJS Setup
// ===============================
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "/public")));

// ===============================
// Middleware
// ===============================
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// ===============================
// Routes
// ===============================
app.get("/", (req, res) => {
    res.send("Hi, I am Root");
});

// ---------- Listings ----------
app.get("/listings", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
}));

app.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
});

app.post("/listings", validateListing, wrapAsync(async (req, res) => {
    const listing = new Listing(req.body.listing);
    await listing.save();
    res.redirect("/listings");
}));

app.get("/listings/:id", wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id).populate("reviews");
    if (!listing) {
        throw new ExpressError(404, "Listing not found.");
    }
    res.render("listings/show.ejs", { listing });
}));

app.get("/listings/:id/edit", wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found.");
    }
    res.render("listings/edit.ejs", { listing });
}));

app.put("/listings/:id", validateListing, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const updated = await Listing.findByIdAndUpdate(
        id,
        req.body.listing,
        { new: true, runValidators: true }
    );
    if (!updated) {
        throw new ExpressError(404, "Listing not found.");
    }
    res.redirect(`/listings/${id}`);
}));

app.delete("/listings/:id", wrapAsync(async (req, res) => {
    await Listing.findByIdAndDelete(req.params.id);
    res.redirect("/listings");
}));

// ---------- Reviews ----------
app.post("/listings/:id/reviews", wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found.");
    }

    const newReview = new Review(req.body.review);
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    res.redirect(`/listings/${listing._id}`);
}));

app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    res.redirect(`/listings/${id}`);
}));

// ---------- Test ----------
app.get("/testlisting", wrapAsync(async (req, res) => {
    const sampleListing = new Listing({
        title: "My New Villa",
        description: "By the beach",
        image: {
            filename: "testimage",
            url: "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?auto=format&fit=crop&w=800&q=60"
        },
        price: 1200,
        location: "Baga, Goa",
        country: "India"
    });
    await sampleListing.save();
    res.send("Successful testing");
}));

// ===============================
// 404 for unknown routes
// ===============================
app.use((req, res, next) => {
    next(new ExpressError(404, "Page not found."));
});

// ===============================
// ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    let status = err.status || 500;
    let message = err.message || "Something went wrong.";

    if (err.name === "ValidationError") {
        status = 400;
        message = Object.values(err.errors).map((e) => e.message).join(", ");
    }

    if (err.name === "CastError") {
        status = 400;
        message = `Invalid value for "${err.path}".`;
    }

    res.status(status).render("error.ejs", { status, message });
});

app.listen(8080, () => {
    console.log("Server is Listening to Port 8080");
});