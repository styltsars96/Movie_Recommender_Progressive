/**
 * Module for connection: API with MySQL DB!
 */
const dbIP = require('./url.js');

const db = {
    connection: null,
    init: () => {
        const mysql = require('mysql');
        this.connection = mysql.createConnection({
            host: dbIP,
            user: 'nodejs',
            password: 'webdev_2018_web',
            database: 'web_dev',
            port: 3306
        });
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
				// console.log(JSON.stringify(fields)) //Test
                if (error) reject(error);
                resolve(results);
            });
        });

    }
};

module.exports = db;
