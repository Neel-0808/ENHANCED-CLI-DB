const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// MongoDB - Get or Create Model
const getOrCreateModel = async (collectionName) => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some(c => c.name === collectionName);

    if (collectionExists) {
        if (mongoose.models[collectionName]) {
            return mongoose.models[collectionName];
        } else {
            const schema = new mongoose.Schema({}, { strict: false });
            return mongoose.model(collectionName, schema, collectionName);
        }
    } else {
        const schema = new mongoose.Schema({}, { strict: false });
        const model = mongoose.model(collectionName, schema, collectionName);
        await mongoose.connection.createCollection(collectionName);
        return model;
    }
};

// MongoDB Operations
const handleMongoDBOperations = async (collectionName, operation, data = null, id = null) => {
    try {
        const Collection = await getOrCreateModel(collectionName);

        switch (operation) {
            case 'create':
                await Collection.create(data);
                break;
            case 'read':
                return await Collection.find().exec();
            case 'update':
                await Collection.updateOne({ _id: id }, data);
                break;
            case 'delete':
                await Collection.deleteOne({ _id: id });
                break;
            default:
                throw new Error('Invalid operation for MongoDB');
        }
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
};

// MySQL Operations
const handleMySQLOperations = async (connection, tableName, operation, data = null, id = null) => {
    switch (operation) {
        case 'create':
            await connection.execute(`INSERT INTO ${tableName} SET ?`, data);
            break;
        case 'read':
            const [tables] = await connection.execute("SHOW TABLES LIKE ?", [tableName]);
            if (tables.length === 0) {
                throw new Error(`The table "${tableName}" does not exist.`);
            }
            const [rows] = await connection.execute(`SELECT * FROM ${tableName}`);
            return rows;
        case 'update':
            await connection.execute(`UPDATE ${tableName} SET ? WHERE id = ?`, [data, id]);
            break;
        case 'delete':
            await connection.execute(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
            break;
        default:
            throw new Error('Invalid operation for MySQL');
    }
};

// SQLite Operations
const handleSQLiteOperations = async (db, tableName, operation, data = null, id = null) => {
    switch (operation) {
        case 'create':
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO ${tableName} (data) VALUES (?)`, [JSON.stringify(data)], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            break;
        case 'read':
            return new Promise((resolve, reject) => {
                db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, rows) => {
                    if (err) reject(err);
                    else if (rows.length === 0) reject(new Error(`The table "${tableName}" does not exist.`));
                    else {
                        db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
                            if (err) reject(err);
                            else resolve(rows);
                        });
                    }
                });
            });
        case 'update':
            await new Promise((resolve, reject) => {
                db.run(`UPDATE ${tableName} SET data = ? WHERE id = ?`, [JSON.stringify(data), id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            break;
        case 'delete':
            await new Promise((resolve, reject) => {
                db.run(`DELETE FROM ${tableName} WHERE id = ?`, [id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            break;
        default:
            throw new Error('Invalid operation for SQLite');
    }
};

// Create Record
const createRecord = async (dbType, collectionName, data) => {
    if (dbType === 'mongodb') {
        await handleMongoDBOperations(collectionName, 'create', data);
    } else if (dbType === 'mysql') {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });
        await handleMySQLOperations(connection, collectionName, 'create', data);
        await connection.end();
    } else if (dbType === 'sqlite') {
        const db = new sqlite3.Database(process.env.SQLITE_DB_PATH);
        await handleSQLiteOperations(db, collectionName, 'create', data);
        db.close();
    } else {
        throw new Error('Unsupported database type');
    }
};

// Read Records
const readRecords = async (dbType, collectionName) => {
    if (dbType === 'mongodb') {
        return await handleMongoDBOperations(collectionName, 'read');
    } else if (dbType === 'mysql') {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });
        const records = await handleMySQLOperations(connection, collectionName, 'read');
        await connection.end();
        return records;
    } else if (dbType === 'sqlite') {
        const db = new sqlite3.Database(process.env.SQLITE_DB_PATH);
        const records = await handleSQLiteOperations(db, collectionName, 'read');
        db.close();
        return records;
    } else {
        throw new Error('Unsupported database type');
    }
};

// Update Record
const updateRecord = async (dbType, collectionName, id, data) => {
    if (dbType === 'mongodb') {
        await handleMongoDBOperations(collectionName, 'update', data, id);
    } else if (dbType === 'mysql') {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });
        await handleMySQLOperations(connection, collectionName, 'update', data, id);
        await connection.end();
    } else if (dbType === 'sqlite') {
        const db = new sqlite3.Database(process.env.SQLITE_DB_PATH);
        await handleSQLiteOperations(db, collectionName, 'update', data, id);
        db.close();
    } else {
        throw new Error('Unsupported database type');
    }
};

// Delete Record
const deleteRecord = async (dbType, collectionName, id) => {
    if (dbType === 'mongodb') {
        await handleMongoDBOperations(collectionName, 'delete', null, id);
    } else if (dbType === 'mysql') {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });
        await handleMySQLOperations(connection, collectionName, 'delete', null, id);
        await connection.end();
    } else if (dbType === 'sqlite') {
        const db = new sqlite3.Database(process.env.SQLITE_DB_PATH);
        await handleSQLiteOperations(db, collectionName, 'delete', null, id);
        db.close();
    } else {
        throw new Error('Unsupported database type');
    }
};

// MongoDB - Generate Schema Report
const generateMongoDBSchema = async (collectionName) => {
    try {
        const collection = mongoose.connection.collection(collectionName);
        console.log(`Checking collection: ${collectionName}`);

        const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
        if (collections.length === 0) {
            console.log(`Collection not found: ${collectionName}`);
            throw new Error(`The collection "${collectionName}" does not exist.`);
        }

        console.log(`Collection found: ${collectionName}`);
        const documents = await collection.find({}).limit(100).toArray();
        console.log(`Documents fetched: ${documents.length}`);

        if (documents.length === 0) {
            throw new Error(`The collection "${collectionName}" is empty.`);
        }

        const schema = {};

        documents.forEach((doc) => {
            Object.keys(doc).forEach((key) => {
                if (!schema[key]) {
                    schema[key] = typeof doc[key];
                }
            });
        });

        console.log("Schema:");
        console.log(JSON.stringify(schema, null, 2)); // Display the schema

        const indexes = await collection.indexInformation();
        console.log("Indexes found:");
        console.log(JSON.stringify(indexes, null, 2));

        return { schema, indexes };
    } catch (error) {
        console.error('Error generating MongoDB schema:', error.message);
        throw error;
    }
};

// MySQL - Generate Schema Report


// Generate Schema Report for MySQL
const generateMySQLSchema = async (connection, tableName) => {
    try {
        console.log(`Checking table: ${tableName}`);

        // Check if the table exists
        const [tables] = await connection.query("SHOW TABLES LIKE ?", [tableName]);
        if (tables.length === 0) {
            console.log(`Table not found: ${tableName}`);
            throw new Error(`The table "${tableName}" does not exist.`);
        }
        
        console.log(`Table found: ${tableName}`);
        
        // Retrieve column details
        const [columns] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
        console.log(`Columns fetched: ${columns.length}`);
        
        if (columns.length === 0) {
            throw new Error(`The table "${tableName}" has no columns.`);
        }
        
        const schema = {};
        columns.forEach(column => {
            schema[column.Field] = column.Type;
        });

        console.log("Schema:");
        console.log(JSON.stringify(schema, null, 2));

        // Retrieve index details
        const [indexes] = await connection.query(`SHOW INDEX FROM ${tableName}`);
        console.log("Indexes found:");
        console.log(JSON.stringify(indexes, null, 2));

        return { schema, indexes };
    } catch (error) {
        console.error('Error generating MySQL schema:', error.message);
        throw error;
    }
};

// SQLite - Generate Schema Report


// Generate Schema Report for SQLite
const generateSQLiteSchema = (db, tableName) => {
    return new Promise((resolve, reject) => {
        console.log(`Checking table: ${tableName}`);
        
        // Check if the table exists
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                console.log(`Table not found: ${tableName}`);
                reject(new Error(`The table "${tableName}" does not exist.`));
            } else {
                console.log(`Table found: ${tableName}`);
                
                // Retrieve column details
                db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
                    if (err) reject(err);

                    const schema = columns.reduce((acc, column) => {
                        acc[column.name] = column.type;
                        return acc;
                    }, {});

                    console.log("Schema:");
                    console.log(JSON.stringify(schema, null, 2));

                    // Retrieve index details
                    db.all(`PRAGMA index_list(${tableName})`, [], (err, indexes) => {
                        if (err) reject(err);

                        console.log("Indexes found:");
                        console.log(JSON.stringify(indexes, null, 2));

                        resolve({ schema, indexes });
                    });
                });
            }
        });
    }).catch(error => {
        console.error('Error generating SQLite schema:', error.message);
        throw error;
    });
};

// Generate Schema for All Supported Databases
const generateSchema = async (dbType, tableName) => {
    if (dbType === 'mongodb') {
        return await generateMongoDBSchema(tableName);
    } else if (dbType === 'mysql') {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });
        const schema = await generateMySQLSchema(connection, tableName);
        await connection.end();
        return schema;
    } else if (dbType === 'sqlite') {
        const db = new sqlite3.Database(process.env.SQLITE_DB_PATH);
        const schema = await generateSQLiteSchema(db, tableName);
        db.close();
        return schema;
    } else {
        throw new Error('Unsupported database type');
    }
};


// Export MongoDB Data
const exportMongoDBData = async (collectionName, format) => {
    try {
        const Collection = await getOrCreateModel(collectionName);
        const data = await Collection.find().lean().exec();

        if (format === 'json') {
            fs.writeFileSync(`${collectionName}.json`, JSON.stringify(data, null, 2));
            console.log(`Data exported to ${collectionName}.json`);
        } else if (format === 'csv') {
            const csv = data.map(row => Object.values(row).join(',')).join('\n');
            fs.writeFileSync(`${collectionName}.csv`, csv);
            console.log(`Data exported to ${collectionName}.csv`);
        } else {
            throw new Error('Unsupported export format');
        }
    } catch (error) {
        console.error('Error exporting MongoDB data:', error.message);
        throw error;
    }
};

// Export MySQL Data
const exportMySQLData = async (connection, tableName, format) => {
    try {
        const [rows] = await connection.execute(`SELECT * FROM ${tableName}`);

        if (format === 'json') {
            fs.writeFileSync(`${tableName}.json`, JSON.stringify(rows, null, 2));
            console.log(`Data exported to ${tableName}.json`);
        } else if (format === 'csv') {
            const csv = rows.map(row => Object.values(row).join(',')).join('\n');
            fs.writeFileSync(`${tableName}.csv`, csv);
            console.log(`Data exported to ${tableName}.csv`);
        } else {
            throw new Error('Unsupported export format');
        }
    } catch (error) {
        console.error('Error exporting MySQL data:', error.message);
        throw error;
    }
};

// Export SQLite Data
const exportSQLiteData = (db, tableName, format) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
            if (err) reject(err);
            else {
                try {
                    if (format === 'json') {
                        fs.writeFileSync(`${tableName}.json`, JSON.stringify(rows, null, 2));
                        console.log(`Data exported to ${tableName}.json`);
                    } else if (format === 'csv') {
                        const csv = rows.map(row => Object.values(row).join(',')).join('\n');
                        fs.writeFileSync(`${tableName}.csv`, csv);
                        console.log(`Data exported to ${tableName}.csv`);
                    } else {
                        throw new Error('Unsupported export format');
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }
        });
    }).catch(error => {
        console.error('Error exporting SQLite data:', error.message);
    });
};

// Export Data
const exportData = async (dbType, collectionName, format) => {
    if (dbType === 'mongodb') {
        await exportMongoDBData(collectionName, format);
    } else if (dbType === 'mysql') {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });
        await exportMySQLData(connection, collectionName, format);
        await connection.end();
    } else if (dbType === 'sqlite') {
        const db = new sqlite3.Database(process.env.SQLITE_DB_PATH);
        await exportSQLiteData(db, collectionName, format);
        db.close();
    } else {
        throw new Error('Unsupported database type');
    }
};

const importMongoDBData = async (collectionName, filePath) => {
    try {
        const absolutePath = path.resolve(filePath);
        const data = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
        const Collection = await getOrCreateModel(collectionName);
        await Collection.insertMany(data);
        console.log(`Data imported from ${absolutePath} into MongoDB collection ${collectionName}`);
    } catch (error) {
        console.error('Error importing MongoDB data:', error.message);
        throw error;
    }
};

// Import MySQL Data
const importMySQLData = async (connection, tableName, filePath) => {
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const columns = Object.keys(data[0]);
        const values = data.map(row => `(${columns.map(col => `'${row[col]}'`).join(',')})`).join(',');

        const sql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES ${values}`;
        await connection.execute(sql);
        console.log(`Data imported from ${filePath} into MySQL table ${tableName}`);
    } catch (error) {
        console.error('Error importing MySQL data:', error.message);
        throw error;
    }
};

// Import SQLite Data
const importSQLiteData = (db, tableName, filePath) => {
    return new Promise((resolve, reject) => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const columns = Object.keys(data[0]);
        const placeholders = columns.map(() => '?').join(',');
        const sql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;

        db.serialize(() => {
            const stmt = db.prepare(sql);
            data.forEach(row => stmt.run(...Object.values(row)));
            stmt.finalize(err => {
                if (err) reject(err);
                else {
                    console.log(`Data imported from ${filePath} into SQLite table ${tableName}`);
                    resolve();
                }
            });
        });
    }).catch(error => {
        console.error('Error importing SQLite data:', error.message);
    });
};

// Import Data
const importData = async (dbType, collectionName, filePath) => {
    if (dbType === 'mongodb') {
        await importMongoDBData(collectionName, filePath);
    } else if (dbType === 'mysql') {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });
        await importMySQLData(connection, collectionName, filePath);
        await connection.end();
    } else if (dbType === 'sqlite') {
        const db = new sqlite3.Database(process.env.SQLITE_DB_PATH);
        await importSQLiteData(db, collectionName, filePath);
        db.close();
    } else {
        throw new Error('Unsupported database type');
    }
};


// Backup MongoDB
const backupMongoDB = (backupDir) => {
    return new Promise((resolve, reject) => {
        const backupDir = "D:\Mongo-backup";
        const mongoURI = `mongodb://localhost:27017/${process.env.DB_NAME}`;
 // Replace this with your actual MongoDB URI

        const command = `mongodump --uri="${mongoURI}" --out="${backupDir}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error backing up MongoDB data:', stderr);
                return reject(error);
            }
            console.log(`MongoDB backup created at ${backupDir}`);
            resolve();
        });
    });
};

// Backup MySQL
const backupMySQL = () => {
    return new Promise((resolve, reject) => {
        const mysqlUser = process.env.MYSQL_USER;
        const mysqlPassword = process.env.MYSQL_PASSWORD;
        const mysqlDB = process.env.MYSQL_DB;
        const backupDir = "D:/MySQL-backup"; // Define backupDir here

        const command = `mysqldump -u ${mysqlUser} -p${mysqlPassword} ${mysqlDB} > ${backupDir}/mysql-backup.sql`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error backing up MySQL data:', stderr);
                return reject(error);
            }
            console.log(`MySQL backup created at ${backupDir}/mysql-backup.sql`);
            resolve();
        });
    });
};

// Backup SQLite
const backupSQLite = () => {
    return new Promise((resolve, reject) => {
        const sqliteDB = process.env.SQLITE_DB_PATH;
        const backupDir = "D:/SQLite-backup"; // Define backupDir here

        const command = `sqlite3 ${sqliteDB} ".backup '${backupDir}/sqlite-backup.db'"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error backing up SQLite data:', stderr);
                return reject(error);
            }
            console.log(`SQLite backup created at ${backupDir}/sqlite-backup.db`);
            resolve();
        });
    });
};


// Main backup function
const backupData = async (dbType, backupDir) => {
    try {
        if (dbType === 'mongodb') {
            await backupMongoDB(backupDir);
        } else if (dbType === 'mysql') {
            const databaseName = process.env.MYSQL_DATABASE;
            const backupFile = path.join(backupDir, 'mysql-backup.sql');
            await backupMySQL(databaseName, backupFile);
        } else if (dbType === 'sqlite') {
            const dbFilePath = process.env.SQLITE_DB_PATH;
            const backupFile = path.join(backupDir, 'sqlite-backup.sqlite');
            await backupSQLite(dbFilePath, backupFile);
        } else {
            throw new Error('Unsupported database type');
        }
    } catch (error) {
        console.error('Error during backup:', error.message);
    }
};

// Function to create a new collection or table

// Main function to list collections or tables based on the database type
async function listCollectionsOrTables(dbType, dbName) {
    switch (dbType) {
        case 'mongodb':
            return await listMongoCollections(dbName);
        case 'mysql':
            return await listMySQLTables(dbName);
        case 'sqlite':
            return await listSQLiteTables(dbName);
        default:
            throw new Error('Unsupported database type.');
    }
}

// Method to list collections for MongoDB using a shell command

// Method to list collections for MongoDB using the MongoDB driver
async function listMongoCollections(dbName) {
    const db = mongoose.connection.useDb(dbName);
    try {
        const collections = await db.db.listCollections().toArray();
        return collections.map(col => col.name);
    } catch (err) {
        throw new Error('Error listing collections: ' + err.message);
    }
}

// List tables for MySQL
async function listMySQLTables(dbName) {
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'password',
        database: dbName
    });

    return new Promise((resolve, reject) => {
        connection.query('SHOW TABLES', (error, results) => {
            if (error) return reject(error);
            const tables = results.map(row => Object.values(row)[0]);
            resolve(tables);
        });
    });
}

// List tables for SQLite
async function listSQLiteTables(dbName) {
    const db = new sqlite3.Database(`${dbName}.db`);
    return new Promise((resolve, reject) => {
        db.all('SELECT name FROM sqlite_master WHERE type="table"', [], (err, rows) => {
            if (err) return reject(err);
            const tables = rows.map(row => row.name);
            resolve(tables);
        });
    });
}
// Function to create a collection or table
async function createCollection(dbType, dbName, collectionName, schema) {
    switch (dbType) {
        case 'mongodb':
            return await createMongoCollection(dbName, collectionName);
        case 'mysql':
            return await createMySQLTable(dbName, collectionName, schema);
        case 'sqlite':
            return await createSQLiteTable(dbName, collectionName, schema);
        default:
            throw new Error('Unsupported database type.');
    }
}

// Create a collection in MongoDB
async function createMongoCollection(dbName, collectionName) {
    const db = mongoose.connection.useDb(dbName);
    await db.createCollection(collectionName);
    console.log(`MongoDB collection ${collectionName} created.`);
}

// Create a table in MySQL
async function createMySQLTable(dbName, tableName, schema) {
    const connection = mysql.createConnection({ /* your MySQL config */ });
    const query = `CREATE TABLE ${tableName} (${schema})`;
    return new Promise((resolve, reject) => {
        connection.query(query, (error) => {
            if (error) return reject(error);
            console.log(`MySQL table ${tableName} created.`);
            resolve();
        });
    });
}

// Create a table in SQLite
async function createSQLiteTable(dbName, tableName, schema) {
    const db = new sqlite3.Database(dbName);
    const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`;
    return new Promise((resolve, reject) => {
        db.run(query, (err) => {
            if (err) return reject(err);
            console.log(`SQLite table ${tableName} created.`);
            resolve();
        });
    });
}

module.exports = {
    createRecord,
    readRecords,
    updateRecord,
    deleteRecord,
    generateSchema,
    generateMongoDBSchema,
    generateMySQLSchema,
    generateSQLiteSchema,
    exportMongoDBData,
    exportMySQLData,
    exportSQLiteData,
    exportData,
    importMongoDBData,
    importMySQLData,
    importSQLiteData,
    importData,
    backupMongoDB,
    backupMySQL,
    backupSQLite,
    backupData,
    createCollection,
    listCollectionsOrTables,
    createMongoCollection,
    createMySQLTable,
    createSQLiteTable,
    listMongoCollections,
    listMySQLTables,
    listSQLiteTables,
    listCollectionsOrTables
    
};