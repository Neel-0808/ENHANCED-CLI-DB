const fs = require('fs');
const { connectDatabase } = require('../utils/dbUtils');

const importData = () => {
  const data = JSON.parse(fs.readFileSync('data.json'));
  mongoose.connection.db.collection('yourCollection').insertMany(data, (err, result) => {
    if (err) throw err;
    console.log('Data imported:', result.insertedCount);
  });
};

module.exports = importData;
