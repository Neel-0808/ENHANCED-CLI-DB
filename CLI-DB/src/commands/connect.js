const mongoose = require('mongoose');
const mysql = require('mysql2');
const sqlite3 = require('sqlite3').verbose();

// Function to create a new database
async function createDatabase(dbType, dbName) {
    if (dbType === 'mongodb') {
        try {
            await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
            const db = mongoose.connection;
            await db.collection('initialCollection').insertOne({ init: true }); // Insert a document to ensure the DB is created
            console.log(`MongoDB database ${dbName} created successfully.`);
        } catch (err) {
            console.error(`Error creating MongoDB database: ${err.message}`);
            throw err;
        }
    } else if (dbType === 'mysql') {
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'password', // Update with your MySQL credentials
        });

        connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`, (err) => {
            if (err) {
                console.error(`Error creating MySQL database: ${err.message}`);
                throw err;
            }
            console.log(`MySQL database ${dbName} created successfully.`);
        });
        connection.end();
    } else if (dbType === 'sqlite') {
        console.log(`SQLite databases are created automatically when the file is created.`);
    } else {
        throw new Error(`Unsupported database type: ${dbType}`);
    }
}

// Function to select and connect to a database
async function selectDatabase(dbType, dbName) {
    if (dbType === 'mongodb') {
        try {
            const connection = await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
            const db = connection.connection;

            // Check if the database actually exists by listing collections
            const collections = await db.db.listCollections().toArray();
            if (collections.length === 0) {
                console.log(`Warning: The database ${dbName} is empty or does not exist.`);
            } else {
                console.log(`Connected to MongoDB database ${dbName}.`);
            }
        } catch (err) {
            console.error(`Error connecting to MongoDB database: ${err.message}`);
            throw err;
        }
    } else if (dbType === 'mysql') {
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'password', // Update with your MySQL credentials
            database: dbName
        });

        connection.connect((err) => {
            if (err) {
                console.error(`Error connecting to MySQL database: ${err.message}`);
                throw err;
            }
            console.log(`Connected to MySQL database ${dbName}.`);
        });

        return connection;
    } else if (dbType === 'sqlite') {
        const db = new sqlite3.Database(`${dbName}.db`, (err) => {
            if (err) {
                console.error(`Error connecting to SQLite database: ${err.message}`);
                throw err;
            }
            console.log(`Connected to SQLite database ${dbName}.`);
        });

        return db;
    } else {
        throw new Error(`Unsupported database type: ${dbType}`);
    }
}

module.exports = {
    createDatabase,
    selectDatabase
};
