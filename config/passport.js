const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcryptjs')
const { User } = require('../models')

// set up Passport strategy
passport.use(new LocalStrategy(
	// customize user field
	{
		usernameField: 'account',
		passwordField: 'password',
		passReqToCallback: true
	},
	// authenticate user
	(req, account, password, cb) => {
		User.findOne({ where: { account } })
			.then(user => {
				if (!user) return cb(null, false, req.flash('error_messages', '帳號或密碼輸入錯誤！'))
				bcrypt.compare(password, user.password).then(res => {
					if (!res) return cb(null, false, req.flash('error_messages', '帳號或密碼輸入錯誤！'))
					return cb(null, user)
				})
			})
	}
))
// serialize and deserialize user
passport.serializeUser((user, cb) => {
	cb(null, user.id)
})
passport.deserializeUser((id, cb) => {
	User.findByPk(id).then(user => {
		console.log(user) // 暫時添加
		return cb(null, user)
	})
})

module.exports = passport
