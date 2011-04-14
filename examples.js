var Aspect = require('./');

// Sample target object
var Product = function(name, cost, currency) { 
	this._name = name;
	this._cost = cost; 
	this._currency = currency;
};
Product.prototype = {
	getCost : function() {
		return this._cost;
	},
	getCurrency : function() {
		return this._currency;
	},
	getName : function() {
		return this._name;
	}
};

var p = new Product('The name is Bond, James Bond.', 300, '$');

// let's look for a method 'view()' 
console.log('property view in class Product: ' + p['view']);  // must be undefined

// Now, let's try to introduce 'view()'

// created a new class
var ModifiedProduct = function() {
};
// added 'view()' method
ModifiedProduct.prototype = {
	view: function (){
		return '[name: ' + this._name + ', cost: ' + this._cost + this._currency + ']';
	}
};
// Calling Aspect library to introduce ModifiedProduct into Product
Aspect.introduce(Product, ModifiedProduct);
console.log(p.view());  // it's there now!

// Now, assume a a usecase: wherever you call 'getCost' you want cost in Rs/- rather than in Dollars.
// so, we add a 'around' aspect: 
Aspect.around(Product, 'getCost', function(){
	var DOLLAR_TO_RUPEES_RATE = 44.3;
	var c = proceed(); // call original getCost() method
	return c * DOLLAR_TO_RUPEES_RATE; // convert to rupees
});

console.log(p.getCost());  // cost in Rs/-!

// what if you want to create a counter to keep a track of the number of times a Product has been viewed? 
// let's add a 'before' advice which would increments 'counter' property!
Aspect.before(Product, 'view', function(){
	// Initialise 'count'
	if(!this.count) this.count = 0;
	// Increment
	this.count++;
});
console.log(p.view()); // every time you call 'view', 'counter' will be incremented. 
console.log(p.counter); // must return '1'

// you could have done the same thing with 'after' advice as well. 

