/*
 * Modified Array's push method to ensure unique elements!
 */
Array.prototype.__push__ = Array.prototype.push;
Array.prototype.push = function(e) {
	// ensure that the element is not already present
	var i = this.length;
	while (i--) {
		if (this[i] === e) {
			// return if element is already present!
			return;
		}
	}
	this.__push__(e);
};

function Aspect() {
	this.const_after = '__node_aop_after__';
	this.const_before = '__node_aop_before__';
};

Aspect.prototype = {
	/**
	 * Introduces new properties to target class.
	 * 
	 * In fact, all properties from the prototype of the class 'introduction'
	 * simply gets copied to class 'target'.
	 * 
	 * Caveat: similar properties will be over-ridden!
	 */
	introduce : function(target, intro) {
		if (typeof (intro) != 'function') {
			throw new Error('\'Introduction\' must be of type \'function\'.');
		}
		
		target = flattenTarget(target);
		for ( var key in intro.prototype) {
			target[key] = intro.prototype[key];
		}
	},
	/**
	 * Applies 'after' aspect.
	 * 
	 * @param target 	(Function|Object) to apply aspect on
	 * @param pattern	array(RegExp|string)) | (string|regExp) to match against target's methods   
	 * @param aspect	Function to be called after the target methods
	 * @param options	{strict: true|false}
	 * @return
	 */	
	after : function(target, pattern, aspect, options) {
		target = flattenTarget(target);
		applyAdvice(target, pattern, aspect, function(aspect, original) {
			return function() {
				var res = original.apply(this, arguments);
				aspect.apply(this, arguments);
				return res;
			};
		}, options);
		target['__afterAdviced'] = true;
	},
	/**
	 * Applies 'before' aspect.
	 * 
	 * @param target 	(Function|Object) to apply aspect on
	 * @param pattern	array(RegExp|string)) | (string|regExp) to match against target's methods   
	 * @param aspect	Function to be called before the target methods
	 * @param options	{strict: true|false}
	 * @return
	 */	
	before : function(target, functions, aspect, options) {
		target = flattenTarget(target);
		applyAdvice(target, functions, aspect, function(aspect, original) {
			return function() {
				aspect.apply(this, arguments);
				return original.apply(this, arguments);
			};
		}, options);
		target['__beforeAdviced'] = true;
	},
	/**
	 * Applies 'around' aspect. 
	 * 
	 * Note: 
	 * 1. Must explicitly call 'var r = proceed()' to call the original method.
	 * 2. Must never apply 'around' after 'after/before' advice. 
	 * 
	 * @param target 	(Function|Object) to apply aspect on
	 * @param pattern	array(RegExp|string)) | (string|regExp) to match against target's methods   
	 * @param aspect	Function which wraps the original method
	 * @param options	{strict: true|false}
	 * @return
	 */	
	around : function(target, functions, aspect, options) {
		target = flattenTarget(target);
		if (target['__beforeAdviced'] || target['__afterAdviced'])
			throw new Error(
					"Must never apply 'around' after you have applied 'before' or 'after'");

		applyAdvice(target, functions, aspect, function(aspect, original) {
			// Bind original method to a new variable '__original__'
			var originalCode = 'var original = ' + original + ";";

			var aspectCode = getFunctionCode(aspect);
			// now replace proceed() from aspect with method call to
			// __original__
			var modifiedAspectCode = aspectCode.replace('proceed();',
					'original.apply(this, arguments);');

			// now add them all together
			var source = originalCode + modifiedAspectCode;
			
			// return a new Function with the modified source!
			return Function(source);
		}, options);
	}
};

// Export
module.exports = new Aspect();

/////////////////////// Utility Functions ///////////////////////

/**
 * Gets proper target object to work upon. 
 * if 'target' is 'function' then return 'target.prototype'
 * if 'target' is 'object' then retun 'target'
 * otherwise, throw Error.
 * 
 * @param target
 * @return
 */
function flattenTarget(target) {
	if (typeof (target) == 'function')
		target = target.prototype; // look in its prototype object
	else if (typeof (target) == 'object')
		target = target; // look in itself
	else
		throw new Error('Target must be an object or function');

	return target;
}

/**
 * Applies advice to a target object.
 * 
 * @param target	Flattened target object
 * @param pattern	array(RegExp|string)) | (string|regExp) to match against target's methods   
 * @param aspect	Aspect
 * @param advice	Advice
 * @return			void
 */
function applyAdvice(target, pattern, aspect, advice, options) {
	
	// default options object
	if (!options)
		options = {
			strict : false
		};
	
	if (typeof (aspect) != 'function')
		throw new Error('Aspect must be a Function');
	
	// get all matching method names
	var properties = getMethodNames(target, pattern);
	
	if(properties.length == 0 && options.strict)
		throw new Error('No matching method found.');
	
	for ( var n = 0; n < properties.length; n++) {
		var name = properties[n];
		var original = target[name];
		if (!original)
			throw new Error('Missing vald method by the name: ' + name);

		target[name] = advice(aspect, original);
	}
}

/**
 * gets an array of unique method names from 'target' object matching 'pattern'.
 * 
 * @param target
 * @param pattern
 * @return
 */
function getMethodNames(target, pattern) {
	// if pattern is not an object, then create an array
	if (typeof (pattern) != 'object')
		pattern = Array(pattern);

	// array to hold matching keys
	var properties = [];

	// iterate through each element of pattern
	for ( var p = 0; p < pattern.length; p++) {
		var key = pattern[p];
		// if 'string'
		if (typeof (key) == 'string') { // get the exact property
			if (target[key] && typeof (target[key]) == 'function')
				properties.push(key);
		}
		// if this a regular expression
		else if (key instanceof RegExp) { // get all matching properties
			for ( var name in target) {
				if (key.test(name) && typeof (target[name]) == 'function')
					properties.push(name);
			}
		}
	}
	return properties;
}


/**
 * Gets source code of a 'func', replaces all new lines (\n and \r with doublespace ' ')
 * 
 * @param func
 * @return
 */
function getFunctionCode(func) {
	var _originalCode = new String(func);
	
	var originalCode = '';
	
	// Remove one liner comments
	// TODO: handle multi-line comments
	var lines = _originalCode.split('\n');
	for (var l = 0; l < lines.length; l++){
		var line = lines[l];
		if (line.indexOf('//') > 0) 
			line = line.substring(0, line.indexOf('//'));
		
		originalCode = originalCode + line;
	}
	
	var modifiedCode = '';
	var n = 0;

	while (originalCode[n]) {
		if (originalCode[n] == '\n' || originalCode[n] == '\r')
			modifiedCode[n++] += ' ';
		else
			modifiedCode += originalCode[n++];
	}

	n = 0;
	while (modifiedCode[n++] != '{')
		;
	modifiedCode = modifiedCode.substring(n, modifiedCode.length - 1);
	return modifiedCode;
}