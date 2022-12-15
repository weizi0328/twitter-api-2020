const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {getUser} = require('../_helpers')
const { User, Tweet, Followship ,sequelize} = require('../models')

const userController = {
	postUsers: (req, res, next) => {
		const { account, name, email, password, checkPassword } = req.body
		if (!account || !name || !email || !password || !checkPassword) throw Error('All field is required!', {}, Error.prototype.code = 402)
		if (password !== checkPassword) throw Error('Passwords do not match!', {}, Error.prototype.code = 422)
		if (!account.match(/^[^ ]+$/) ||!password.match(/^[^ ]+$/))throw Error('Can not have space!', {}, Error.prototype.code = 455)
		if (password.length < 4 || password.length > 12) throw Error('Password over!', {}, Error.prototype.code = 412)
		if (account.length > 50 || name.length > 50) throw Error('Name or account over!', {}, Error.prototype.code = 403)
		if (!email.match(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/)) throw Error('Invalid email format!', {}, Error.prototype.code = 401)

		Promise.all([
			User.findOne({ where: { email } }),
			User.findOne({ where: { account } })
		])
			.then(([userEmail, userAccount]) => {
				if (userEmail) throw new Error('Email already exists!', {}, Error.prototype.code = 408)
				if (userAccount) throw new Error('Account already exists!', {}, Error.prototype.code = 423)
				return bcrypt.hash(password, 10)
			})
			.then(hash => User.create({
				account,
				name,
				email,
				password: hash,
				cover: 'https://i.imgur.com/KNbtyGq.png'

			}))
			.then(user => {
				delete user.get({ plain: true }).password
				res.status(200).json(user)
			})
			.catch(err => next(err))
	},
	logIn:(req, res, next) => {
		const userData = getUser(req).toJSON()
		delete userData.password
		try {
			// eslint-disable-next-line no-undef
			const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '30d' })
			res.status(200).json({
					token,
					user: userData
			})
		} catch (err) {
			next(err)
		}
	},
	getUser: (req, res, next) => {
		const id = req.params.id
		return Promise.all([
			User.findByPk(id),
			Tweet.findAndCountAll({
				where: { userId: id }
			}),
			Followship.findAndCountAll({
				where: {followingId: id }
			}),
			Followship.findAndCountAll({
				where: {followerId: id }
			})
		])
			.then(([user, tweets, following, follower]) => {
				const userData = user.get({ plain: true })
				delete userData.password
				userData.followingCount =following.count
				userData.followerCount =follower.count
				userData.tweetsCount =tweets.count
				res.status(200).json(userData)
			})
			.catch(err => next(err))
	},
	putUser: (req, res, next) => {
		const { account, name, email, password, avatar, introduction, cover } = req.body
 			User.findByPk(req.params.id)	
			.then(user => {
				if (!user) throw new Error('User is not exist!')
				return user.update({
					account, 
					name, 
					email, 
					password, 
					avatar, 
					introduction, 
					cover
				})
			})
			.then((data) => {
				res.json({ data })
			})
			.catch(err => next(err))
	},
	getUserFollowing:(req,res,next)=>{
		Followship.findAll({
			where: { followerId: req.params.id },
			attributes: {
				include: [
				  [sequelize.literal('(SELECT id FROM Users WHERE Users.id = Followship.following_id)'), 'id'],
				  [sequelize.literal('(SELECT account FROM Users WHERE Users.id = Followship.following_id)'), 'account'],
				  [sequelize.literal('(SELECT name FROM Users WHERE Users.id = Followship.following_id)'), 'name'],
				  [sequelize.literal('(SELECT introduction FROM Users WHERE Users.id = Followship.following_id)'), 'introduction'],
				  [sequelize.literal('(SELECT avatar FROM Users WHERE Users.id = Followship.following_id)'), 'avatar'],
				//   [sequelize.literal(`EXISTS(SELECT true FROM Followships WHERE Followships.follower_id = ${getUser(req).id} AND Followships.following_id = Followship.following_id)`), 'Following']
				]
			  },
			  order: [['createdAt', 'DESC']],
			  raw: true
			})
		.then((followingList)=>{
			res.status(200).json(followingList)
		})
		.catch(err=>{console.log(err)})
	}
}

module.exports = userController
