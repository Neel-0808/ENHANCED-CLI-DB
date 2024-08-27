const fs = require('fs');
const { connectDatabase } = require('../utils/dbUtils');

const backup = () => {
  mongoose.connection.db.collection('yourCollection').find({}).toArray((err, data) => {
    if (err) throw err;
    fs.writeFileSync('backup.json', JSON.stringify(data, null, 2));
    console.log('Database backup created as backup.json');
  });
};

module.exports = backup;
