const express = require('express');

const Product = require("../models/product");
const Cart = require("../models/cart");
const Order = require("../models/order");

let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // Get first success message from flash
  let successMsg = req.flash("success")[0];

  // Find all products in db
  let products = Product.find((err, products) => {
    // Use callback to ensure all records are found prior to passing data and rendering view

    let productChunks = []; // Array to hold groups (chunks) of returned product docs
    let chunkSize = 3; // Number of product docs in each group

    for (let i = 0; i < products.length; i += chunkSize) { // Loop through returned documents, incrementing by chunkSize each iteration
      // Push a chunk of product docs into arr
      productChunks.push(products.slice(i, i+chunkSize)); // Slice from current arr position to chunkSize positions forward
    }

    // Render products index view
    // Pass products data to view
    res.render('shop/index', { title: 'GameDrop', products: productChunks, successMsg: successMsg, noMessages: !successMsg});
  });
});

/* GET add to cart view */
router.get("/add-to-cart/:id", (req, res, next) => { // id of product to add to cart
  // Cache id of item to add to cart
  let productId = req.params.id;

  // Create new cart, passing old cart if one exists
  let cart = new Cart(req.session.cart ? req.session.cart : {});

  // Find product based on id
  Product.findById(productId, (err, product) => {
    if (err) {
      return res.redirect("/");
    }

    // Add item to cart
    cart.add(product, product.id);

    // Store cart in session
    req.session.cart = cart;

    console.log(req.session.cart); // to test functionality
    res.redirect("/");
  });
});

/* GET cart view */
router.get("/cart", (req, res, next) => {
  if (!req.session.cart) { // If no items in cart
    return res.render("shop/shopping-cart", {products: null}); // Pass no products
  }

  // Otherwise there are items in cart
  let cart = new Cart(req.session.cart); // Create cart from session data

  // Render cart view passing item information and total price of cart
  res.render("shop/shopping-cart", {products: cart.generateArray(), totalPrice: cart.totalPrice})
});

/* GET checkout view */
router.get("/checkout", isLoggedIn, (req, res, next) => {
  if (!req.session.cart) { // If no cart exists
    // Redirect to shopping cart page
    return res.redirect("/shopping-cart");
  }

  let cart = new Cart(req.session.cart); // Create cart from session data

  // Display first error message
  let errMsg = req.flash("error")[0];

  // Render checkout view and pass data
  res.render("shop/checkout", {total: cart.totalPrice, errMsg: errMsg, noError: !errMsg});
});


router.post("/checkout", (req, res, next) => {
  // Redirect user if they don't have a cart
  if (!req.session.cart) {
    return res.redirect("/shopping-cart");
  }

  // Create cart from session data
  let cart = new Cart(req.session.cart);

  // Use Stripe
  const stripe = require("stripe")(process.env.APIKEY_STRIPE);

  const charge = stripe.charges.create({
    amount: cart.totalPrice * 100, // convert price to cents
    currency: 'usd',
    description: 'Test charge',
    source: req.body.stripeToken,
  }, (err, charge) => {
    if (err) {
      // Add error message to flash
      req.flash("error", err.message);
      res.redirect("/checkout");
    }

    let order = new Order({
      user: req.user,
      cart: cart,
      address: req.body.address,
      name: req.body.name,
      paymentId: charge.id
    });

    order.save((err, order) => {
      if (err) {
        req.flash("error", "SERVER ERROR: Problem saving order. Try again. If issues continue, please contact the website administrator.");
        res.redirect("/checkout");
      }
      // Add success message to flash
      req.flash("success", "Purchase successful!");

      // Set session cart to null, effectively emptying the cart
      req.session.cart = null;
      res.redirect("/");
    });

  });

});

module.exports = router;


// Write own middleware to handle route protection
function isLoggedIn(req, res, next) {
  // If user is authenticated, continue as normal
  if (req.isAuthenticated()) {
      return next();
  }

  // Store url user was attempting to access
  req.session.oldUrl = req.url;

  // Otherwise user is not authenticated, so redirect them
  res.redirect("/user/signin");
}