// index.js

const { Command } = require('commander');
const inquirer = require('inquirer');
const { createDatabase, selectDatabase } = require('./src/commands/connect');
const {
    createRecord,
    readRecords,
    updateRecord,
    deleteRecord,
    generateSchema,
    exportData,
    importData,
    backupData,
    createCollection,
    listCollectionsOrTables, // Import the listCollectionsOrTables function
} = require('./src/commands/crud');
const readline = require('readline');

const program = new Command();

program
    .version('1.0.0')
    .description('Enhanced DB Management CLI Tool');

program
    .command('interactive')
    .description('Run the CLI tool in interactive mode')
    .action(async () => {
        await runInteractiveMode();
    });

async function runInteractiveMode() {
    const { dbType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'dbType',
            message: 'Select the database type:',
            choices: ['mongodb', 'mysql', 'sqlite'],
        },
    ]);

    const { dbAction } = await inquirer.prompt([
        {
            type: 'list',
            name: 'dbAction',
            message: 'Would you like to select an existing database or create a new one?',
            choices: ['Select Existing', 'Create New'],
        },
    ]);

    let dbName;
    let dbConnection;

    if (dbAction === 'Create New') {
        const { newDbName } = await inquirer.prompt([
            {
                type: 'input',
                name: 'newDbName',
                message: 'Enter the name for the new database:',
            },
        ]);

        dbName = newDbName;
        await createDatabase(dbType, dbName);
    } else {
        const { existingDbName } = await inquirer.prompt([
            {
                type: 'input',
                name: 'existingDbName',
                message: 'Enter the name of the existing database:',
            },
        ]);

        dbName = existingDbName;
    }

    try {
        dbConnection = await selectDatabase(dbType, dbName);
        console.log(`${dbType} connected successfully 😊`);

        let continueLoop = true;

        while (continueLoop) {
            const { operation } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'operation',
                    message: 'What would you like to do?',
                    choices: [
                        'List Collections/Tables',
                        'Create a Collection/Table',
                        'Create a New Record',
                        'Read Records',
                        'Update a Record',
                        'Delete a Record',
                        'Generate Schema Report',
                        'Export Data',
                        'Import Data',
                        'Backup Database',
                        'Exit',
                    ],
                },
            ]);

            await handleOperation(operation, dbType, dbName);

            if (operation === 'Exit') {
                continueLoop = false;
            }

            await pause(); // Pause to let the user read the output
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (dbConnection) {
            if (dbType === 'mongodb') {
                await mongoose.disconnect();
            } else if (dbType === 'mysql') {
                dbConnection.end(); // Close the MySQL connection
            } else if (dbType === 'sqlite') {
                dbConnection.close(); // Close the SQLite database
            }
        }
    }
}

async function handleOperation(operation, dbType, dbName) {
    switch (operation) {
        case 'List Collections/Tables':
            await handleListCollectionsOrTables(dbType, dbName);
            break;

        case 'Create a Collection/Table':
            await handleCreateCollection(dbType, dbName);
            break;

        case 'Create a New Record':
            await handleCreateRecord(dbType);
            break;

        case 'Read Records':
            await handleReadRecords(dbType);
            break;

        case 'Update a Record':
            await handleUpdateRecord(dbType);
            break;

        case 'Delete a Record':
            await handleDeleteRecord(dbType);
            break;

        case 'Generate Schema Report':
            await handleGenerateSchemaReport(dbType);
            break;

        case 'Export Data':
            await handleExportData(dbType);
            break;

        case 'Import Data':
            await handleImportData(dbType);
            break;

        case 'Backup Database':
            await handleBackupDatabase(dbType);
            break;

        case 'Exit':
            console.log('Goodbye!');
            break;

        default:
            console.log('Invalid choice.');
            break;
    }
}

async function handleListCollectionsOrTables(dbType, dbName) {
    try {
        const collectionsOrTables = await listCollectionsOrTables(dbType, dbName);
        console.log('Collections/Tables:', collectionsOrTables.join('\n'));
    } catch (err) {
        console.error('Error listing collections/tables:', err.message);
    }
}

// index.js

// Import statements...

async function handleCreateCollection(dbType, dbName) {
    const { collectionAction } = await inquirer.prompt([
        {
            type: 'list',
            name: 'collectionAction',
            message: 'Would you like to select an existing collection/table or create a new one?',
            choices: ['Select Existing', 'Create New'],
        },
    ]);

    if (collectionAction === 'Create New') {
        const collectionAnswers = await inquirer.prompt([
            {
                type: 'input',
                name: 'collectionName',
                message: 'Enter the collection/table name:',
            },
            {
                type: 'input',
                name: 'schema',
                message: 'Enter the schema for the collection/table (e.g., "id INT PRIMARY KEY, name VARCHAR(255)"):',
                when: (answers) => dbType !== 'mongodb', // Schema is only needed for SQL databases
            },
        ]);

        try {
            await createCollection(dbType, dbName, collectionAnswers.collectionName, collectionAnswers.schema || '');
        } catch (err) {
            console.error('Error creating collection/table:', err.message);
        }
    } else {
        const collectionsOrTables = await listCollectionsOrTables(dbType, dbName);
        console.log('Existing Collections/Tables:', collectionsOrTables.join('\n'));
    }
}


// Similarly, update handleCreateRecord, handleReadRecords, handleUpdateRecord, handleDeleteRecord, handleGenerateSchemaReport, handleExportData, handleImportData, handleBackupDatabase functions

async function handleCreateRecord(dbType) {
    const createAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'collection',
            message: 'Enter the collection/table name:',
        },
        {
            type: 'input',
            name: 'data',
            message: 'Enter the data as JSON:',
        },
    ]);

    try {
        const parsedData = JSON.parse(createAnswers.data);
        await createRecord(dbType, createAnswers.collection, parsedData);
        console.log('Record inserted successfully.');
    } catch (err) {
        console.error('Error inserting record:', err.message);
    }
}

async function handleReadRecords(dbType) {
    const readAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'collection',
            message: 'Enter the collection/table name:',
        },
    ]);

    try {
        const records = await readRecords(dbType, readAnswers.collection);
        console.log('Records:', JSON.stringify(records, null, 2));
    } catch (err) {
        console.error('Error reading records:', err.message);
    }
}

async function handleUpdateRecord(dbType) {
    const updateAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'collection',
            message: 'Enter the collection/table name:',
        },
        {
            type: 'input',
            name: 'id',
            message: 'Enter the record ID to update:',
        },
        {
            type: 'input',
            name: 'data',
            message: 'Enter the updated data as JSON:',
        },
    ]);

    try {
        const parsedData = JSON.parse(updateAnswers.data);
        await updateRecord(dbType, updateAnswers.collection, updateAnswers.id, parsedData);
        console.log('Record updated successfully.');
    } catch (err) {
        console.error('Error updating record:', err.message);
    }
}

async function handleDeleteRecord(dbType) {
    const deleteAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'collection',
            message: 'Enter the collection/table name:',
        },
        {
            type: 'input',
            name: 'id',
            message: 'Enter the record ID to delete:',
        },
    ]);

    try {
        await deleteRecord(dbType, deleteAnswers.collection, deleteAnswers.id);
        console.log('Record deleted successfully.');
    } catch (err) {
        console.error('Error deleting record:', err.message);
    }
}

async function handleGenerateSchemaReport(dbType) {
    const schemaAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'collection',
            message: 'Enter the collection/table name:',
        },
    ]);

    try {
        await generateSchema(dbType, schemaAnswers.collection);
    } catch (err) {
        console.error('Error generating schema report:', err.message);
    }
}


async function handleExportData(dbType) {
    const exportAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'collection',
            message: 'Enter the collection/table name:',
        },
        {
            type: 'list',
            name: 'format',
            message: 'Select the export format:',
            choices: ['csv', 'json'],
        },
    ]);

    try {
        await exportData(dbType, exportAnswers.collection, exportAnswers.format);
        console.log('Data exported successfully.');
    } catch (err) {
        console.error('Error exporting data:', err.message);
    }
}


async function handleImportData(dbType) {
    const importAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'collection',
            message: 'Enter the collection/table name:',
        },
        {
            type: 'input',
            name: 'inputPath',
            message: 'Enter the input file path for import:',
        },
    ]);

    try {
        await importData(dbType, importAnswers.collection, importAnswers.inputPath);
        console.log('Data imported successfully.');
    } catch (err) {
        console.error('Error importing data:', err.message);
    }
}

async function handleBackupDatabase(dbType) {
    const backupAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'backupPath',
            message: 'Enter the backup file path:',
        },
    ]);

    try {
        await backupData(dbType, backupAnswers.backupPath);
        console.log('Database backed up successfully.');
    } catch (err) {
        console.error('Error backing up database:', err.message);
    }
}

function pause() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Press Enter to continue...', () => {
            rl.close();
            resolve();
        });
    });
}

program.parse(process.argv);
