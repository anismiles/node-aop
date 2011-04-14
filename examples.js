var Aspect = require('./');

// Sample target object
var Product = function(name, cost, currency) { 
	this._name = name;
	this._cost = cost; 
	this._currency = currency;
};

var p = new Product('The name is Bond, James Bond.', 300);
console.log(p['getCost']);  

// Introduction
var ModifiedProduct = function() {
};
ModifiedProduct.prototype = {
	getCost : function() {
		return this._cost;
	},
	getCurrency : function(){
		return this._currency;
	},
	getName : function() {
		return this._name;
	},
	view: function (){
		return JSON.stringify(this);
	}
};

Aspect.introduce(Product, ModifiedProduct);
//console.log(p.getCost());

Aspect.around(Product, 'getCost', function(){
	var DOLLAR_TO_RUPEES_RATE = 44.3;
	var c = proceed(); // call original getCost() method
	return c * DOLLAR_TO_RUPEES_RATE;
});

console.log(p.getCost());

Aspect.before(Product, 'view', function(){
	if(!this.count) this.count = 0;
	this.count++;
});
console.log(p.view());

