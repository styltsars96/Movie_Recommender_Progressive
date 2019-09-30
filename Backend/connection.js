/**
 * Module for connection: API with MySQL DB!
 */
const dbConn = require('./database.js');

const db = {
    connection: null,
    init: () => {
        const mysql = require('mysql');
        this.connection = mysql.createConnection(dbConn);
        this.connection.connect();
    },
    /**
     * Send a prepared statement to mySQL!
     * @param  {string}   query   The query string, with bind variables!
     * @param  {Array}   values   The values for the bind variables!
     * @param  {Function} callback A callback(error, result) as handler.
     */
    query: (query, values) => {
        if (typeof values != 'object') throw "Invalid values type!"
        if (typeof query != 'string') throw "Invalid query type!"
        return new Promise((resolve, reject) => {
            this.connection.query({
                sql: query,
                timeout: 30000,
                values: values
            }, function(error, results, fields) {
                if (error) reject(error);
                resolve(results);
            });
        });

    }
};

module.exports = db;
