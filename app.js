const express = require('express')
const routes = require('./routes/apis')
const helpers = require('./_helpers')


const app = express()
const port = process.env.PORT || 3000

// use helpers.getUser(req) to replace req.user
function authenticated(req, res, next) {
  // passport.authenticate('jwt', { ses...
}

app.use(express.urlencoded({ extended: true }))
// app.use(methodOverride('_method'))

app.use(routes)

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

module.exports = app