const { app } = require('./server-original');

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`SSR server started: http://localhost:${port}`));
