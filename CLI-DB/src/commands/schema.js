const mongoose = require('mongoose');

const schema = () => {
  mongoose.connection.db.listCollections().toArray((err, collections) => {
    if (err) throw err;
    collections.forEach(collection => {
      console.log('Collection:', collection.name);
    });
  });
};

module.exports = schema;
