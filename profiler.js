/*
 * Profiler Library v0.2-SNAPSHOT
 * http://github.com/jeremi/js-profiler
 *
 * Copyright 2010, Jeremi Joslin
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */
 /*jslint browser:true, evil:true, nomen:false */
 /*global alert: false, confirm: false, console: true, prompt: false, window: true */
"use strict";
 
var profiler = profiler || (function () {
    var start_times = {},
        calls = {};
    
    function logCall(call_id, time) {
        if (typeof time !== "number" || isNaN(time)) {
            return;
        }
        if (!(call_id in calls)) {
            calls[call_id] = [time];
        } else {
            calls[call_id].push(time);
        }
    }    
    
    function formatElem(elem) {
        var str = "";

        if (elem.tagName) {
            str = "&lt;" + elem.tagName.toLowerCase();

            if (elem.id) {
                str += "#" + elem.id;
            }
            if (elem.className) {
                str += "." + elem.className.replace(/ /g, ".");
            }
            str += "&gt;";
        } else {
            str = elem.nodeName;
        }

        return str;
    }
    
    function formatArgs(args) {
        var str = [], i, item;

        for (i = 0; i < args.length; i += 1) {
            item = args[i];

            if (item && item.constructor === Array) {
                str.push("Array(" + item.length + ")");
            } else if (item && item.nodeName) {
                str.push(formatElem(item));
            } else if (item && typeof item === "function") {
                str.push("function()");
            } else if (item && typeof item === "object") {
                str.push("{...}");
            } else if (typeof item === "string") {
                str.push('"' + item.replace(/&/g, "&amp;").replace(/</g, "&lt;") + '"');
            } else {
                str.push(item + "");
            }
        }

        return str.join(", ");
    }
    
    function getFunction(name) {
        return eval(name);
    }
    
    function start_profiling(/* String */ call_id) {
        start_times[call_id] = (new Date()).getTime();
    }
    
    function stop_profiling(/* String */ call_id) {
        var diff = (new Date()).getTime() - start_times[call_id];
        logCall(call_id, diff);
        start_times[call_id] = undefined;
        return diff;
    }
    
    function instrument(name, max_depth) {
        //to avoid conflict of name, we should prefix our var
        var func, new_func, member;
        
        if (max_depth === undefined) {
            max_depth = 4;
        } else if (max_depth < 0) {
            return;
        }
        
        func = getFunction(name);
        
        if (!func || func._is_profiled || func.nodeName) {
            return;
        }
        
        if (typeof func === "object") {
            for (member in func) {
                if (member !== "prototype") {
                    instrument(name + "[\"" + member + "\"]", max_depth - 1);
                } 
            }
            return;
        }
        
        if (typeof func !== "function") {
            return;
        }
        new_func = function () {
            var res, call_id = name + "(" + formatArgs(arguments) + ")";
            start_profiling(call_id);
            try {
                res = func.apply(this, arguments);
            } finally {
                stop_profiling(call_id);
            }
            return res;
        };
        new_func._original = func;
        new_func._is_profiled = true;
        
        //we replace the old function by our modified one
        eval(name + "=new_func;");
    }
    
    function parseName(name) {
        var owner, func;
        if (name.indexOf("#") !== -1) {
            name = name.substring(0, name.indexOf("#"));
        }
        if (name.indexOf(".") === -1) {
            owner = null;
        } else {
            owner = eval(name.substring(0, name.lastIndexOf(".")));
        }
        func = eval(name);
        return [owner, func];
    }

    function process_stats(times) {
        var num = times.length, results = {runs: num}, i, log = 0;

        times = times.sort(function (a, b) {
            return a - b;
        });

        // Make Sum
        results.sum = 0;

        for (i = 0; i < num; i += 1) {
            results.sum += times[i];
        }

        // Make Min
        results.min = times[0];

        // Make Max
        results.max = times[num - 1];

        // Make Mean
        results.mean = results.sum / num;

        for (i = 0; i < num; i += 1) {
            log += Math.log(times[i]);
        }

        results.geometric_mean = Math.pow(Math.E, log / num);

        // Make Median
        results.median = num % 2 === 0 ?
            (times[Math.floor(num / 2)] + times[Math.ceil(num / 2)]) / 2 :
            times[Math.round(num / 2)];

        // Make Variance
        results.variance = 0;

        for (i = 0; i < num; i += 1) {
            results.variance += Math.pow(times[i] - results.mean, 2);
        }

        results.variance /= num - 1;

        // Make Standard Deviation
        results.deviation = Math.sqrt(results.variance);

        return results;
    }

    function getReports(/* String */ name) {
        var stats = [], report, call_id;
        if (name === undefined) {
            for (call_id in calls) {
                report = process_stats(calls[call_id]);
                report.name = call_id;
                stats.push(report);
            }
            return stats;
        }
        report = process_stats(calls[name]);
        report.name = name;
        return report;
    }
    
    function getValues(/* String */ name) {
        if (name === undefined) {
            return calls;
        }
        return calls[name];
    }
    
    function displayReport() {
        var content = "<table style='text-align:left;background:#FFF;color:#000;font-size:10px;width:1024px;overflow:auto;padding:8px;margin:10px;'><tr style='font-size:12px;'><td>Name</td><td>runs</td><td>sum</td><td>mean</td><td>min</td><td>max</td></tr>",
            reports = this.getReports(),
            report,
            report_id,
            content_el;

        //we sort by mean
        reports = reports.sort(function (a, b) {
            return b.mean - a.mean;
        });
        
        for (report_id in reports) {
            report = reports[report_id];
            if (typeof report === 'object') {
                content = content + "<tr><td>" + report.name + "</td><td>" + report.runs + "</td><td>" + report.sum + "</td><td>" + Math.round(report.mean * 100) / 100  + "</td><td>" + Math.round(report.min * 100) / 100 + "</td><td>" + Math.round(report.max * 100) / 100 + "</td></tr>";
            }
            
        }
        content = content + "</table>";
        content_el = document.createElement('div');
        content_el.innerHTML = content;
        document.getElementsByTagName("body")[0].appendChild(content_el);
    }
    
    function getFunctionName (func) {
        var name = /\W*function\s+([\w\$]+)\(/.exec(func);
        if(!name) {
            return 'Anonymous Function';
        }
        return name[1];
    }
    
    function resetValues () {
        calls = [];
        return this;
    }
    
    return {
        start: start_profiling,
        stop: stop_profiling,
        
        profile: function (/* String */name, max_depth) {
            try {
                instrument(name, max_depth);
            } finally {
                if (window.console && console.log) {
                    console.log("Profiling of " + name + " ready");
                }
            }
            return this;
        },
        
        getReports: getReports,

        getValues: getValues,
        
        displayReport: displayReport,
        
        resetValues: resetValues,
        
        benchmark: {

            benchmark_fast_function: function (/* String */func_or_name, /* Function */callback, /* Function */next) {
                var res, owner, func, runs = [], r = 0, n;

                if (typeof func_or_name === "function") {
                    owner = null;
                    func = func_or_name; 
                    func_name = getFunctionName(func);
                } else {
                    res = parseName(func_or_name);
                    owner = res[0];
                    func = res[1];
                    func_name = func_or_name;
                }

                setTimeout(function () {
                    var start = (new Date()).getTime(), diff = 0;

                    for (n = 0; diff < 1000; n += 1) {
                        func.apply(owner, []);
                        diff = (new Date()).getTime() - start;
                    }

                    runs.push(n);

                    if (r < 4) {
                        r += 1;
                        setTimeout(arguments.callee, 0);
                    }
                    else {
                        callback(func_name, process_stats(runs));
                        if (next) {
                            setTimeout(next, 0);
                        }
                    }
                }, 0);
            },

            /*
             * You should use this function if you want to benchmark a function that is slow
             */
            benchmark_slow_function: function (/* Integer */repeat, /* String */func_or_name, /* Function */callback, /* Function */next) {
                var res, owner, func, i, func_name;
                
                if (typeof func_or_name === "function") {
                    owner = null;
                    func = func_or_name; 
                    func_name = getFunctionName(func);
                } else {
                    res = parseName(func_or_name);
                    owner = res[0];
                    func = res[1];
                    func_name = func_or_name;
                }
                
                
                setTimeout(function () {
                    for (i = 0; i < repeat; i += 1) {
                        start_profiling(func_name);
                        func.apply(owner, []);
                        stop_profiling(func_name);
                    }
                    callback(func_name, getReports(func_name));
                    if (next) {
                        setTimeout(next, 0);
                    }
                }, 0);
            },
            
            resetValues: resetValues,

            getValues: getValues,

            displayReport: displayReport
        }
    };
}());