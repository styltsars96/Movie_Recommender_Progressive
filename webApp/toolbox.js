/**
 * @author Stylianos Tsarsitalidis
 * Reusable, dependency-free Web Development JavaScript tools collection.
 */

//JS Toolkit Functions ---------------------------------------------------------
//Curry any function (recursive)
const curry = (fn, ...args) => //Destructure arguments
    (fn.length <= args.length) ? fn(...args) : //ends when like f(arg)
    (...more) => curry(fn, ...args, ...more); //otherwise continue destructuring

//Format String: Capitalize first letter.
const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

//Check if an Array contains an object.
const contains = (arr, element) => {
    if(typeof element == 'object'){
        for (let i = 0; i < arr.length; i++){
            if(JSON.stringify(arr[i]) == JSON.stringify(element)){
                return true;
            }
        }
    } else for (let i = 0; i < arr.length; i++) {
        if (arr[i] == element) {
            return true;
        }
    }
    return false;
};

//Switch character or string case (uppercase <--> lowercase)
const switchCharCase = (str) => {
    if (str == str.toUpperCase()) {
        str = str.toLowerCase();
    } else if (str == str.toLowerCase()) {
        str = str.toUpperCase();
    }
    return str;
};

// Check if a String contains any of some given characters.
// bothCases= true for accepting both lowercase and uppercase of wantedCharacters.
const checkChar = (theString, wantedCharacters, bothCases) => {
    for (let i = 0; i < wantedCharacters.length; i++) {
        if (theString.indexOf(wantedCharacters.charAt(i)) >= 0) {
            return true;
        }
        if (bothCases && theString.indexOf(switchCharCase(wantedCharacters.charAt(i))) >= 0) {
            return true;
        }
    }
    return false;
};

//UI Tools ---------------------------------------------------------------------
//Remove a table row, using an id in a cell within tah row.
const removeRow = (elemId) => {
    let targetElem = document.getElementById(elemId);
    targetElem = targetElem.parentElement.parentElement; //Select tr element.
    targetElem.parentElement.removeChild(targetElem);
};

/**
 * Create a table based on JSON array.
 * For columns, the keys of the first object are used.
 * @param {Array} arr An array of objects to be converted to a table.
 * @param {String} class OPTIONAL The class attribute of the table.
 * @param {Boolean} isDom OPTIONAL Specify if the inserted array contains DOM (if object instead of string) and function should return DOM.
 * @param {Array} cols OPTIONAL Array of strings, the keys to use for all objects, which become column names.
 * @param {String} customHeader OPTIONAL Custom html header for table.
 */
const array2table = (arr, classes, bodyId, isDom, cols, customHeader) => {
    classes = classes || '';
    cols = cols || Object.keys(arr[0]);
    let headerRow = '';
    let bodyRows = '';
    const parser = isDom ? new DOMParser() : undefined;
    if (customHeader) { //Custom header row
        headerRow = customHeader;
    } else cols.map(col => { //Make header Row
        headerRow = `${headerRow} <th> ${capitalizeFirstLetter(col).replace('_',' ')} </th>`;
    });
    let headerDOM = isDom ?
        parser.parseFromString(`<thead><tr>${headerRow}</tr></thead>`, "text/xml").firstChild : undefined;
    //Rest of Rows
    let bodyDOM = isDom ? document.createElement("tbody") : undefined;
    if (isDom) { //IF DOM...
        if (bodyId) bodyDOM.id = bodyId;
        arr.map(row => {
            let tr = document.createElement("tr");
            cols.map(colName => {
                let td = document.createElement("td");
                if (typeof row[colName] === "object") { //means it is ready DOM
                    td.appendChild(row[colName]);
                } else {
                    td.innerText = row[colName];
                }
                tr.appendChild(td);
            });
            bodyDOM.appendChild(tr);
        });
    } else arr.map(row => { //If NOT DOM // Changed.
        let thisRow = '';
        let id;
        cols.map(colName => { //For each column
            if (colName == 'id') {
                id = row[colname];
            } else thisRow += `<td> ${row[colName]} </td>`;
        });
        if (id) {
            thisRow = `<tr id="${id}"> ${thisRow}</tr>`
        } else thisRow = `<tr>${thisRow}</tr>`;
        bodyRows += thisRow;
    });
    if (isDom) {
        let table = document.createElement("table");
        if (classes) table.class = classes;
        table.appendChild(headerDOM);
        table.appendChild(bodyDOM);
        return table;
    } else {
        bodyId = bodyId || '';
        return `<table class=${classes}> <thead><tr>${headerRow}</tr></thead>` +
            `<tbody ${bodyId} >${bodyRows}</tbody></table>`;
    }
};

/**
 * Create DOM from HTML.
 * @param {String} string HTML to be parsed.
 */
const parseDOM = function(string) {
    const doc = new DOMParser().parseFromString(string, "text/xml");
    return doc.firstChild;
};

/**
 * EVENTS: 'Enter' on source element == 'Click' on target Element
 * @param {String} sourceElemID ID of source element.
 * @param {String} targetElemID ID of target element.
 */
const enterEqualsClick = (sourceElemID, targetElemID) => {
    const input = document.getElementById(sourceElemID);
    input.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) document.getElementById(targetElemID).click();
    });
};

/**
 * Call an Array's function that acceps callback (from its prototype) on an HTMLCollection, or anything similar.
 * @param collection The collection to call the Array prototype function on.
 * @param {String} functionName The name of the function to call.
 * @param {function} callback The callback inside that function.
 */
const arrayCall = (collection, functionName, callback) => {
    const temp = Array.prototype;
    return temp[functionName].call(collection, callback);
};

//Request Tools ----------------------------------------------------------------
/**
 * Wrap XMLHttprequest, and return Promise.
 * Inputs: Method ("GET" or "POST"), URL, headers, parameters or body, type of content
 * Returns: Promise that wraps the request.
 * Relosved with the complete ajax object.
 * Defaults to POSTing with JSON as content.
 * @param {string} method The HTTP method to use.
 * @param {string} url The url to call.
 * @param {String | Object} params OPTIONAL The parameters to be used for POST etc.
 * @param {Object} headers OPTIONAL The custom headers to be used.
 * @param {param_type} headers OPTIONAL The type of parameters. Possible values JSON, URL.
 */
function doRequest(method, url, headers = undefined, params = undefined, param_type = 'JSON') {
    return new Promise(function(resolve, reject) {
        const ajax = new XMLHttpRequest();
        ajax.open(method.toUpperCase(), url, true);
        ajax.onreadystatechange = function() {
            if (this.readyState == 4) { //Application Level (HTTP) Handling.
                if (this.status == 200) {
                    console.log(`Successful HTTP ${method.toUpperCase()} request @ ${url}`);
                    resolve(ajax);
                } else if (this.status > 200 && this.status < 300) {
                    console.warn(`Request was successful, BUT NOT OK. HTTP ${method.toUpperCase()} @ ${url} with status code: ${this.status}`);
                    resolve(ajax);
                } else {
                    console.warn(`Unsuccessful Request Attempt of HTTP ${method.toUpperCase()} @ ${url}`);
                    reject({
                        status: this.status,
                        statusText: this.statusText
                    });
                }
            }
        };
        ajax.onerror = function() { //Network Level Error
            console.error(`Network Level Error during HTTP ${method.toUpperCase()} @ ${url}`);
        };
        if (headers) { //Set up headers if passed.
            for (key in headers) ajax.setRequestHeader(key, headers[key]);
        }
        //For POSTing!!!
        //If params are object. If string, this is skipped.
        if (params && typeof params === 'object') {
            if (param_type == 'JSON') {
                ajax.setRequestHeader("Content-Type", "application/json");
                params = JSON.stringify(params);
            } else if (param_type == "URL") {
                params = Object.keys(params).map(function(key) {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
                }).join('&');
            }
        }
        ajax.send(params);
    });
}

/**
 * Helper function for parsing JSON from response of the above function.
 * Inputs: The ajax object that did the request.
 * Outputs: Results as object.
 * @param {XMLHttpRequest} ajax Object that did the request.
 */
const responseJSON = (ajax) => {
    return JSON.parse(ajax.responseText);
}

//Workers Message Communication Tools ------------------------------------------
/*An msg object that contains:
 -command: The command(s) to be executed. 'command' = function inside worker +
    (if needed) the corresponding reaction to the function's response.
 -payload: The data to be used.
The commands object (commandsObj parameter) contains functions.
 */
//Page Side, after worker response.
const postWorkerProcess = (commandsObj) => {
    return function(evt) {
        var msg = evt.data;
        const commands = commandsObj;
        commands[msg.command](msg.payload); //Execute post-command segment.
    }
}

//Worker Side
const workerProcess = (commandsObj) => {
    return function(evt) {
        var msg = evt.data;
        //console.log(JSON.stringify(evt.data));//TEST
        //Each command corresponds to function. Input is the payload.
        // Returns payload if result is to be sent back.
        const commands = commandsObj;
        //Execute command and post msg back to Page if required.
        let command = commands[msg.command];
        let newPayload = command(msg.payload);
        if (newPayload) {
            msg.payload = newPayload;
            (msg);
        }
    }
};

//Construct msg. Used when sending commands to Workers.
//String, Anything, Object
const constructMSG = (command, payload, msgExtras) => {
    let msg = {};
    msg.command = command;
    if (payload) msg.payload = payload;
    if (msgExtras) Object.assign(msgExtras, msg);
    return msg;
}

// Collaborative Filtering Tools -----------------------------------------------

//For Pearson Correlation, credits to: http://www.code-in-javascript.com/pearsons-correlation-coefficient-in-javascript/
const pearsonCorrelation = (independent, dependent) => {
    // covariance
    let independent_mean = arithmeticMean(independent);
    let dependent_mean = arithmeticMean(dependent);
    let products_mean = meanOfProducts(independent, dependent);
    let covariance = products_mean - (independent_mean * dependent_mean);
    // standard deviations of independent values
    let independent_standard_deviation = standardDeviation(independent);
    // standard deviations of dependent values
    let dependent_standard_deviation = standardDeviation(dependent);
    // Pearson Correlation Coefficient
    let rho = covariance / (independent_standard_deviation * dependent_standard_deviation);
    return rho;
};

const arithmeticMean = (data) => {
    let total = 0;
    for (let i = 0, l = data.length; i < l; total += data[i], i++);
    return total / data.length;
};

const meanOfProducts = (data1, data2) => {
    let total = 0;
    for (let i = 0, l = data1.length; i < l; total += (data1[i] * data2[i]), i++);
    return total / data1.length;
};

const standardDeviation = (data) => {
    let squares = [];
    for (let i = 0, l = data.length; i < l; i++) {
        squares[i] = Math.pow(data[i], 2);
    }
    let mean_of_squares = arithmeticMean(squares);
    let mean = arithmeticMean(data);
    let square_of_mean = Math.pow(mean, 2);
    let variance = mean_of_squares - square_of_mean;
    let std_dev = Math.sqrt(variance);
    return std_dev;
};
