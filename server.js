const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const routes = require('./routes/routes');
const app = express();
const PORT = process.env.PORT || 4000;

try {

    app.use(cors());
    app.use(fileUpload());
    app.use('/', routes);

} catch (e) {
    console.log(e)
    throw e
}
app.listen(PORT, function () {
    console.log(`http://localhost:${PORT}`);
});