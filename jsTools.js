var jsTools = jsTools || {};
jsTools._utils = jsTools._utils || {};

jsTools._utils.parseName = function(name) {
	var owner, func_name;
	if (name.indexOf("#") !== -1) {
		name = name.substring(0, name.indexOf("#"))
	}
	if (name.indexOf(".") === -1) {
		func_name = name;
		owner = window;
	} else {
		owner = eval(name.substring(0, name.lastIndexOf(".")));
		func_name = name.substring(name.lastIndexOf(".") + 1);
	}
	return [owner, func_name];
};

jsTools._utils.process_stats = function(times) {
	var num = times.length, results = {runs: num};

  	times = times.sort(function(a,b){
    	return a - b;
  	});

  	// Make Sum
  	results.sum = 0;

  	for ( var i = 0; i < num; i++ )
    	results.sum += times[i];

  	// Make Min
  	results.min = times[0];

  	// Make Max
  	results.max = times[ num - 1 ];

  	// Make Mean
  	results.mean = results.sum / num;

  	var log = 0;

  	for ( var i = 0; i < num; i++ ) {
   		log += Math.log(times[i]);
  	}

  	results.geometric_mean = Math.pow(Math.E, log / num);

  	// Make Median
  	results.median = num % 2 == 0 ?
    	(times[Math.floor(num/2)] + times[Math.ceil(num/2)]) / 2 :
    	times[Math.round(num/2)];

  	// Make Variance
  	results.variance = 0;

  	for ( var i = 0; i < num; i++ ) {
    	results.variance += Math.pow(times[i] - results.mean, 2);
	}

  	results.variance /= num - 1;

  	// Make Standard Deviation
  	results.deviation = Math.sqrt( results.variance );

  	return results;
};

jsTools.profile = (function() {
	var start_times = {},
		calls = {};
	
	function start_profiling(/* String */ call_id) {
		start_times[call_id] = (new Date).getTime();
	}
	
	function stop_profiling(/* String */ call_id, skip_record) {
		var diff = (new Date).getTime() - start_times[call_id];
		//add_time(report_id, diff);
		logCall(call_id, diff);
		start_times[call_id] = undefined;
		return diff;
	}
	
	function instrument(name) {
		//to avoid conflict of name, we should prefix our var
		var owner, func_name, func;
		
		[owner, func_name] = jsTools._utils.parseName(name);
		
		func = owner[func_name];
		if (func._is_profiled) {
			return;
		}
		
		if (typeof func === "object") {
			for (member in func) {
				if (member !== "prototype") {
					instrument(name + "." + member);
				} 
			}
			return;
		}
		
		if (typeof func !== "function") {
			return;
		}
		
		owner[func_name] = function() {
			var time,
				call_id = name + "(" + formatArgs(arguments) + ")";
			
			start_profiling(call_id);
			try {
				func.apply(this, arguments);
			} finally {
				stop_profiling(call_id);
			}
		}
		owner[func_name]._original = func;
		owner[func_name]._is_profiled = true;
	}
	
	function logCall(call_id, time) {
		if (!(call_id in calls)) {
			calls[call_id] = [time];
		} else {
			calls[call_id].push(time);
		}
	}
	
	function formatElem(elem) {
		var str = "";

	    if ( elem.tagName ) {
	      	str = "&lt;" + elem.tagName.toLowerCase();

	    	if ( elem.id ) {
	        	str += "#" + elem.id;
			}
	    	if ( elem.className ) {
	        	str += "." + elem.className.replace(/ /g, ".");
			}
	    	str += "&gt;";
	    } else {
	      	str = elem.nodeName;
	    }

	    return str;
	}
	
	function formatArgs(args) {
	    var str = [];

	    for ( var i = 0; i < args.length; i++ ) {
	    	var item = args[i];

	      	if ( item && item.constructor == Array ) {
	        	str.push( "Array(" + item.length + ")" );
	      	} else if ( item && item.nodeName ) {
				str.push( formatElem( item ) );
	      	} else if ( item && typeof item == "function" ) {
	        	str.push( "function()" );
	      	} else if ( item && typeof item == "object" ) {
	        	str.push( "{...}" );
	      	} else if ( typeof item == "string" ) {
	        	str.push( '"' + item.replace(/&/g, "&amp;").replace(/</g, "&lt;") + '"' );
	      	} else {
	        	str.push( item + "" );
	      	}
	    }

	    return str.join(", ");
	}
	
	return {
		start: start_profiling,
		stop: stop_profiling,
		
		profile: function(/* String */name) {
			instrument(name);
			return this;
		},
		
		getReports:function(/* String */ name) {
			if (name === undefined) {
				var stats = {};
				for (call_id in calls) {
					stats[call_id] = jsTools._utils.process_stats(calls[call_id]);
				}
				return stats;
			}
			return jsTools._utils.process_stats(calls[name]);
		},

		getValues:function(/* String */ name) {
			if (name === undefined) {
				return calls;
			}
			return calls[name];
		},
		
		displayReport: function() {
			
		}
	}
}())

jsTools.benchmark = (function() {
	return {
		
		/*
		 * This is made to benchmark fast function.
		 * it has been largely inspired from http://ejohn.org/blog/javascript-benchmark-quality/
		 */
		benchmark_fast_function: function(/* String */func_name, /* Function */callback, /* Function */next) {
			var res, owner, func, runs = [], r = 0;

			res = jsTools._utils.parseName(func_name);
			owner = res[0];
			func = res[1];
			func = owner[func];
			
			
			setTimeout(function(){
				var start = (new Date).getTime(), diff = 0;

			    for ( var n = 0; diff < 1000; n++ ) {
			      	func.apply(owner, []);
			      	diff = (new Date).getTime() - start;
			    }

			    runs.push( n );

			    if ( r++ < 4 )
			      setTimeout( arguments.callee, 0 );
			    else {
			      callback(func_name, jsTools._utils.process_stats(runs));
			      if ( next )
			        setTimeout( next, 0 );
			    }
			  }, 0);
			
		},
		
		/*
		 * You should use this function if you want to benchmark a function that is slow
		 */
		benchmark_slow_function: function(/* Integer */repeat, /* String */func_name, /* Function */callback, /* Function */next) {
			var res, owner, func;
			res = jsTools._utils.parseName(func_name);
			owner = res[0];
			func = res[1];
			func = owner[func];
			setTimeout(function(){
				for (var i = 0; i < repeat; i++) {
					jsTools.profile.start(func_name);
					func.apply(owner, []);
					jsTools.profile.stop(func_name);
				}
				callback(func_name, jsTools.profile.getReport(func_name));
				if ( next )
		    		setTimeout( next, 0 );
			}, 0);
		},
		
		getReport:function(/* String */ name) {
			return jsTools.profile.getReport(name);
		},

		getValue:function(/* String */ name) {
			return jsTools.profile.getValue(name);
		}
	}
}());


