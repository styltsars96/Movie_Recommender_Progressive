/**
 * @author Stylianos Tsarsitalidis
 * Requires: toolbox.js
 * Reusable tools for using IndexedDB, without external dependencies.
 */
var globalDB; // Global database object.

/**
 * Check if the IndexedDB is supported.
 */
const checkIDB = function() {
    //Use alternate indexedDBs in other browsers.
    window.indexedDB = window.indexedDB || window.mozIndexedDB ||
        window.webKitIndexedDB || window.msIndexedDB;
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {
        READ_WRITE: "readwrite"
    }; // This line should only be needed if it is needed to support the object's constants for older browsers
    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    //Always alert if indexedDB is not supported.
    if (!('indexedDB' in window)) {
        console.log('This browser doesn\'t support IndexedDB');
        alert("This browser does not support indexedDB! \nPlease use a more modern browser!");
    } else {
        console.log('IndexedDB is Available');
    }
};

/**
 * Set up the Database for the app!
 * The parameter objStores is the most important and it is like this:
 * [{storeName, options, indexes[{indexName, property, options}]}]
 * Return Database object!
 * @param {String} idbName The name for the App's Database
 * @param {Object} objStores The above object with all the necessary stuff.
 * @param {Number} dbVersion The version of the created database.
 */
const setupIDB = (idbName, objStores, dbVersion, callback) => {
    dbVersion = dbVersion || 1;
    //Create or replace Database, set up object stores!
    let dbRequest = indexedDB.open(idbName, dbVersion);
    //When version changes and when DB is being made...
    dbRequest.onupgradeneeded = (e) => {
        let upgradeDb = e.target.result;
        console.log('Checking object stores...');
        // create object stores if they do not exist.
        objStores.map((st) => {
            if (!upgradeDb.objectStoreNames.contains(st.storeName)) {
                console.log('Making a new object store: ' + st.storeName);
                let {
                    storeName,
                    options,
                    indexes
                } = st;
                let newStore;
                if (!options) {
                    newStore = upgradeDb.createObjectStore(storeName);
                } else newStore = upgradeDb.createObjectStore(storeName, options);
                if (indexes) { //Create indexes
                    indexes.map(({
                        indexName,
                        property,
                        options
                    }) => {
                        if (!options) {
                            newStore.createIndex(indexName, property);
                        } else newStore.createIndex(indexName, property, options);
                    });
                }
            } else {
                console.log(`Object Store ${storeName} is already here!`);
            }
        });
    }
    dbRequest.onerror = (event) => { // What to do on error.
        console.log("Database setup error: " + event.target.errorCode);
        console.dir(event);
    };
    dbRequest.onsuccess = (event) => { // What to do on success.
        console.log("DataBase setup successful!");
        globalDB = event.target.result;
        if(callback) callback();
    };
};

/**
 * Error Handling Helper. Add custom error handler.
 * @param {Object} transaction The transaction which is to be handled.
 * @param {function} callback The logic to be executed. callback(event)
 */
const handleDBerror = (transaction, callback) => {
    transaction.onerror = function(evt) {
        console.error(`Error on IDB Access: ${evt.target.errorCode}`);
        if (callback) callback(evt);
    };
};

/**
 * Access Database! (Create transaction.)
 * Returns the request object. Use that and handle onsuccess and onerror for it.
 * If data (or cursor) is to be returned by the operation, the callback has event
 *   as parameter, gets result as event.target.result !
 * To do an operation on an index, insert the optional index parameter.
 * Modes to use on this function: 'add', 'get', 'put', 'delete', 'getAll','cursor'
 *  'getKey', 'getAllKeys', 'keyCursor'
 * Notes: 'add' and 'put' are very similar.
 * The data parameter to use is like this:
 *  For 'get' and 'getKey' operation: {getKey:'someKey'}
 *  For 'delete' operation: {deleteKey:'someKey' or IDBKeyRange}
 *  OPTIONAL For 'cursor' operation:
 *    {optionalKeyRange: IDBKeyRange, optionalDirection: IDBCursorDirection}
 *  OPTIONAL For 'getAll' operation:
 *    {optionalConstraint: 'someKey' or IDBKeyRange , count: Number of elements}.
 *  For the rest it is {data: my data, optionalKey: 'myKey'} OR just my data.
 * For batch update, use batchMode mode and use the batch update on the returned object.
 * @param {String} objStore The name of the object store to use.
 * @param {String} mode Mode of operation.
 * @param {Object} data The data to use for the operation.
 * @param {String} index OPTIONAL Index to open a cursor at object store.
 */
const accessIDB = (objStore, mode, data, index) => {
    const readWriteOps = ['add', 'put', 'delete'];
    const readOnlyOps = ['get', 'getKey', 'getAll', 'cursor', 'getAllKeys', 'keyCursor'];
    const otherOps = ['batchMode'];
    const dbCommands = { // Operation to be done.
        add: () => {
            //console.log("Adding data: "+JSON.stringify(data)); //TEST
            if (optionalKey) {
                return store.add(data, optionalKey);
            }
            return store.add(data);
        },
        get: () => {
            console.log("Getting data: " + JSON.stringify(data)); //TEST
            if (data) {
                return store.get(data.getKey);
            }
            return store.get();
        },
        getKey: () => {
            if (data) {
                return store.getKey(data.getKey);
            }
            return store.getKey();
        },
        put: () => {
            if (optionalKey) {
                return store.put(data, optionalKey);
            }
            return store.put(data);
        },
        delete: () => {
            return store.delete(data.deleteKey);
        },
        getAll: () => {
            if (data) {
                if (data.optionalConstraint && data.count) {
                    return store.getAll(data.optionalConstraint, data.count);
                }
                if (data.optionalConstraint) {
                    return store.getAll(data.optionalConstraint);
                }
            }
            return store.getAll();
        },
        getAllKeys: () => {
            if (data) {
                if (data.optionalConstraint && data.count) {
                    return store.getAllKeys(data.optionalConstraint, data.count);
                }
                if (data.optionalConstraint) {
                    return store.getAllKeys(data.optionalConstraint);
                }
            }
            return store.getAllKeys();
        },
        cursor: () => {
            if (data) {
                if (data.optionalKeyRange && data.optionalDirection) {
                    return store.openCursor(data.optionalKeyRange, data.optionalDirection);
                }
                if (data.optionalKeyRange) {
                    return store.openCursor(data.optionalKeyRange);
                }
            }
            return store.openCursor();
        },
        keyCursor: () => {
            if (data) {
                if (data.optionalKeyRange && data.optionalDirection) {
                    return store.openKeyCursor(data.optionalKeyRange, data.optionalDirection);
                }
                if (data.optionalKeyRange) {
                    return store.openKeyCursor(data.optionalKeyRange);
                }
            }
            return store.openKeyCursor();
        }
    };
    let transactionMode;
    // CHECK INTEGRITY!
    if (contains(readWriteOps, mode)) { //Set transaction mode.
        transactionMode = 'readwrite';
    } else if (contains(readOnlyOps, mode)) {
        transactionMode = 'readonly';
    } else if (contains(otherOps, mode)) {
        if (mode == 'batchMode') {
            transactionMode = 'readwrite';
        }
    } else {
        console.log('Invalid IDB transaction mode ' + mode);
        return;
    }
    if (mode == 'delete') {
        if ((!data) || (!data.deleteKey)) {
            console.error("Indexed DB DELETE REQUIRES SOME KEY!");
            return;
        }
    }
    let optionalKey;
    if (mode == 'put' || mode == 'add') {
        if (!data) {
            console.error("Indexed DB ADD AND PUT REQUIRE DATA!");
            return;
        }
        //If there is an optional key...
        if (data.data && data.optionalKey) {
            optionalKey = data.optionalKey;
            data = data.data;
        }
    }
    // Make operation.
    let store = globalDB.transaction([objStore], transactionMode).objectStore(objStore);
    if (index) store = store.index(index); //If index is specified.
    if (mode == 'batchMode') { //Put many objects in db, sequentially, al in a single transaction.
        return store;
    } else {
        //Return transaction, in order to handle later.
        let trxObj = dbCommands[mode](); //Get transaction object.
        //handleDBerror(trxObj);//Set Default Error Handler, change later if something extra is needed.
        return trxObj;
    }
};


/**
 * Make a batch insert (add) or update (put).
 * Used for accessing data only.
 * Use batchUpdate for put or add operations with array of objects to be inserted.
 * @param {String} objStore The name of the object store to use.
 * @param {String} mode Mode of operation.
 * @param {Object} data The Array of objects to be stored with the batch transaction.
 * @param {function} callback The logic to be executed. callback(data)
 * @param {Boolean} async If not set, or false, update is done sequentially.
 * @param {String} optionalKey Key for where to do the update.
 */
const batchUpdate = (objStore, mode, data, callback, async, optionalKey) => {
    if (!Array.isArray(data)) {
        console.error("Non-Array passed into batch update.");
        return;
    }
    if (mode == 'put' || mode == 'add') {
        if (!data) {
            console.error("Indexed DB ADD AND PUT REQUIRE DATA!");
            return;
        }
    } else {
        console.error("BatchUpdate: Invalid mode!");
        return;
    }
    if (async) { //Multi-transaction, async.
        data.map((element) => {
            // TODO Not important: cover the optionalKey case...
            let command = accessIDB(objStore, mode, element);
            command.onsuccess = () => {
                //console.log("Updated (during batch): " + JSON.stringify(element));
                callback(element);
            };
            command.onerror = () => {
                console.log("Error while batch updating: " + JSON.stringify(element));
            }
        });
    } else {// Single transaction version.
        let store = accessIDB(objStore, 'batchMode');
        const dbCommands = {
            add: (data) => {
                if (optionalKey) {
                    return store.add(data, optionalKey);
                }
                return store.add(data);
            },
            put: (data) => {
                if (optionalKey) {
                    return store.put(data, optionalKey);
                }
                return store.put(data);
            }
        };
        // Set up event onsuccess handler for each element.
        var batchIndex = 0;
        function doNext() {
            if (batchIndex < data.length) {
                //console.log("Batch step: Adding " + JSON.stringify(data[batchIndex]) + " , Index: " + batchIndex);
                let command = dbCommands[mode](data[batchIndex]);
                command.onsuccess = doNext;
                command.onerror = () => {
                    console.log("Error while batch updating: " + JSON.stringify(data[batchIndex]) + " , Index: " + batchIndex);
                }
                batchIndex++;
            } else { //Batch update complete
                console.log('Batch update complete');
                if (callback) callback();
            }
        }
        doNext();
    }
}



/**
 * Success Handling Helper. Add handler, avoiding the repetitive stuff.
 * Used for accessing data only.
 * @param {Object} transaction The transaction which is to be handled.
 * @param {function} callback The logic to be executed. callback(data)
 */
const handleDBsuccess = (transaction, callback) => {
    transaction.onsuccess = function(evt) {
        var data = evt.target.result;
        if (data) {
            callback(data);
        } else {
            console.log("Empty results");
            callback();
        }
    }
};

/**
 * Cursor Handling Helper. Add handler, avoiding the repetitive stuff.
 * Used for accessing data through cursor only.
 * @param {Object} transaction The transaction which is to be handled.
 * @param {function} callback The logic to be executed. callback(key, object)
 */
const handleCursorSuccess = (transaction, callback) => {
    transaction.onsuccess = function(evt) {
        var cursor = evt.target.result;
        if (cursor) {
            var object = cursor.value;
            var key = cursor.key;
            callback(key, object);
            cursor.continue();
        } else {
            console.log("No more entries in cursor");
        }
    };
};

/**
 * Make a search range for Indexed DB (an IDBKeyRange)
 * Gets lower and upper bounds.
 *  The ______NotEqual is for Not including equals to the key in the range!
 * {lower, upper, lowerNotEqual (OPTIONAL) , upperNotEqual (OPTIONAL)} or {only}
 * Check: https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
 * @param {Object} obj The object with all the parameters.
 */
const createIDBrange = (obj) => {
    let {
        lower,
        upper,
        lowerNotEqual,
        upperNotEqual,
        only
    } = obj;
    if (!lower && !upper) {
        if (only) {
            IDBKeyRange.only(only);
        } else return;
    }
    let range;
    if (lower && upper) {
        let lNE, uNE = false;
        if (lowerNotEqual) lNE = true;
        if (upperNotEqual) uNE = true;
        range = IDBKeyRange.bound(lower, upper, lNE, uNE);
    } else if (upper) {
        if (upperNotEqual) {
            IDBKeyRange.upperBound(upper, upperNotEqual);
        } else range = IDBKeyRange.upperBound(upper);
    } else if (lower) {
        if (lowerNotEqual) {
            IDBKeyRange.lowerBound(lower, lowerNotEqual);
        } else range = IDBKeyRange.lowerBound(lower);
    }
    return range;
};
