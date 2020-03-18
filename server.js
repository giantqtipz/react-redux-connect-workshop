const app = require('./app');
const { sync  } = require('./db');
const axios = require('axios');

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log(`listening on port ${port}`));

sync()
  .then(()=> console.log(`sync done`));

