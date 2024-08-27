const fs = require('fs');
const { connectDatabase } = require('../utils/dbUtils');

const exportData = () => {
  // Example: Export MongoDB data to JSON file
  mongoose.connection.db.collection('yourCollection').find({}).toArray((err, data) => {
    if (err) throw err;
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    console.log('Data exported to data.json');
  });
};

module.exports = exportData;
