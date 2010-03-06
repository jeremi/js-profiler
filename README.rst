##################
js-profiler README
##################

This javascript library will help you to profile and benchmark your javascript. It has no external dependencies.
Tested with Firefox 3.5, IE7 and Chrome. It should also work on the other browsers.

This is at the state of Beta, but it is working. If you encounter any bug, please report them.


To profile
==========

* Include profiler.js in the page you want to profile.
* Call: *profiler.profile("yourFunctionOrObjectName");* be careful, your function or object name should be in a string.
* To print the report, call: *profiler.displayReport()* It will add it at the end of your file.
* You can copy/paste the report to a google spreadsheet to filter it as you want.


To benchmark a function
=======================
Include profiler.js in the page you want to benchmark.

If the function you want to benchmark is slow, use profiler.benchmark.benchmark_slow_function. It will execute your function the specified number of time. You will receive the report in the callback function.

profiler.benchmark.benchmark_slow_function(numberOfRepeat, "yourFunctionToBenchmark", function(func_name, report) {console.log(report);});

For the other functions you should better use the profiler.benchmark.benchmark_fast_function. It will try to execute your function as much as possible in 1 second. You will receive the report in the callback function.

profiler.benchmark.benchmark_fast_function("yourFunctionToBenchmark", function(func_name, report) {console.log(report);});

Licence
=======
You may use this project under the terms of either the MIT License or the GNU General Public License (GPL) Version 2.

Thanks
======
This has been (largely) inspired by :

* http://ejohn.org/blog/javascript-benchmark-quality/
* http://www.stevesouders.com/blog/2010/03/03/p3pc-google-analytics/
* http://developer.yahoo.com/yui/profiler/