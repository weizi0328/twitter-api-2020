const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { getUser, imgurFileHandler, localFileHandler } = require('../_helpers')
const { User, Tweet, Followship, Like, Reply, sequelize } = require('../models')
const id = require('faker/lib/locales/id_ID')

const userController = {
	postUsers: (req, res, next) => {
		const { account, name, email, password, checkPassword } = req.body
		if (!account || !name || !email || !password || !checkPassword) throw Error('All field is required!', {}, Error.prototype.code = 402)
		if (password !== checkPassword) throw Error('Passwords do not match!', {}, Error.prototype.code = 422)
		if (/\s/.test(account) || /\s/.test(password)) throw Error('Can not have space!', {}, Error.prototype.code = 402)
		if (password.length < 4 || password.length > 12) throw Error('Password over!', {}, Error.prototype.code = 412)
		if (account.length > 50) throw Error('Account is over!', {}, Error.prototype.code = 403)
		if (name.length > 50) throw Error('Name is over!', {}, Error.prototype.code = 413)
		if (!email.match(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/)) throw Error('Invalid email format!', {}, Error.prototype.code = 401)

		Promise.all([
			User.findOne({ where: { email } }),
			User.findOne({ where: { account } })
		])
			.then(([userEmail, userAccount]) => {
				if (userEmail && userAccount) throw new Error('Account and Email already exists!', {}, Error.prototype.code = 405)
				if (userEmail) throw new Error('Email already exists!', {}, Error.prototype.code = 408)
				if (userAccount) throw new Error('Account already exists!', {}, Error.prototype.code = 423)
				return bcrypt.hash(password, 10)
			})
			.then(hash => User.create({
				account,
				name,
				email,
				role: 'user',
				avatar: 'https://i.imgur.com/PuP3Fmn.jpg',
				password: hash,
				cover: 'https://i.imgur.com/KNbtyGq.png',
				introduction: 'Hello world!'

			}))
			.then((user) => {
				delete user.get({ plain: true }).password
				const userData = {
					id: user.id,
					account: user.account,
					name: user.name,
					email: user.email,
					updatedAt: user.updatedAt,
					createdAt: user.createdAt
				}
				const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '30d' })
				res.status(200).json({ token, user })
			})
			.catch(err => next(err))
	},
	logIn: (req, res, next) => {
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
		const currentUser = getUser(req).id
		return Promise.all([
			User.findByPk(id),
			Tweet.findAndCountAll({
				where: { UserId: id }
			}),
			Followship.findAndCountAll({
				where: { followingId: id }
			}),
			Followship.findAndCountAll({
				where: { followerId: id }
			}),
			Followship.findAll({
				where: { followingId: id },
				raw: true
			})
		])
			.then(([user, tweets, follower, following, ifFollowing]) => {

				if (!user) throw new Error('user is invalidated', {}, Error.prototype.code = 402)
				const userData = user.get({ plain: true })
				delete userData.password
				userData.followingCount = following.count
				userData.followerCount = follower.count
				userData.tweetsCount = tweets.count
				userData.isfollowing = false

		  ifFollowing.forEach((f)=>{
			if(f.followerId ===currentUser){
				userData.isfollowing = true
			}
		  })
		  res.status(200).json(userData)
		 })
		 .catch(err => next(err))
	   },
	putUser: async (req, res, next) => {
		const account = req.body.account || null
		const name = req.body.name|| null
		const email = req.body.email|| null
		const password = req.body.password|| null
		const checkPassword = req.body.checkPassword|| null
		const introduction  = req.body.introduction|| null
		const { files } = req
		let fileCover = null
		let fileAvatar = null
		try{
			if (account) { if (/\s/.test(account) || account.length > 50) throw new Error('Account is over!', {}, Error.prototype.code = 403) }
			if (password || checkPassword) {
				if (password !== checkPassword ) throw new Error('PasswordCheck is not equal to password!', {}, Error.prototype.code = 407)
				if (/\s/.test(password) || password.length < 4 || password.length > 12) throw new Error('Invalid Password!', {}, Error.prototype.code = 422)
			}
			if (name) { if (name.length > 50) throw new Error('Invalid name!', {}, Error.prototype.code = 413) }
			if (email) { if (!email.match(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/)) throw new Error('Invalid email format!', {}, Error.prototype.code = 411) }
			if (introduction) { if (introduction.length > 160) throw new Error('Invalid introduction!', {}, Error.prototype.code = 403) }

			if(files){
				if(files.avatar){
					// console.log('有沒有進files裡面',files.avatar[0])
					fileAvatar = await imgurFileHandler(files.avatar[0])
				}
				if(files.cover){
					// console.log('有沒有進files cover',files.cover[0])
					fileCover = await imgurFileHandler(files.cover[0])
				}
			}
			console.log(fileAvatar,fileCover)
			const user = await User.findByPk(req.params.id,{raw: true })
			if (!user) throw new Error('User is not exist!', {}, Error.prototype.code = 412)
			let nowStatusIndex = 0
			let responseData = []
			responseData.push({"status":200})
			responseData.push({"status":423,"message":"Account already exists!"})
			responseData.push({"status":408,"message":"Email already exists!"})
			responseData.push({"status":405,"message":"Account and Email already exists!"})
			let hash = null

			// 帳號要改的話 CODE:423
			if(account){
				console.log('have account?')
				let accountCheck = await User.findOne({ where: { account },raw: true }) 
				if (accountCheck && user.account !== accountCheck.account) nowStatusIndex += 1
			}

			// 信箱要改的話 CODE:408
			if (email) {
				console.log('have email?')
				let emailCheck = await User.findOne({ where: { email }}, {raw: true })
				if (emailCheck && user.email !== emailCheck.email) nowStatusIndex += 2
			}

			// 確認驗證結果
			if(nowStatusIndex !== 0){
				throw new Error(responseData[nowStatusIndex].message, {}, Error.prototype.code = responseData[nowStatusIndex].status)
			}

			if (password) {
			hash = await bcrypt.hash(password, 10)
			}

			const userUpdate = await User.update({
				account: account || user.account,
				name: name || user.name,
				email: email || user.mail,
				password: hash || user.password,
				avatar: fileAvatar||user.avatar,
				introduction: introduction || user.introduction,
				cover: fileCover||user.cover
			},{where:{id:req.params.id}}
			)
			const data = await User.findByPk(req.params.id,{raw: true })
			delete data.password
			res.status(200).json(data)

		}catch (err) { next(err) }
	},
	getUserFollowing: (req, res, next) => {
		Followship.findAll({
			where: { followerId: req.params.id },
			attributes: {
				include: [
					[sequelize.literal('(SELECT id FROM Users WHERE Users.id = Followship.following_id)'), 'id'],
					[sequelize.literal('(SELECT account FROM Users WHERE Users.id = Followship.following_id)'), 'account'],
					[sequelize.literal('(SELECT name FROM Users WHERE Users.id = Followship.following_id)'), 'name'],
					[sequelize.literal('(SELECT introduction FROM Users WHERE Users.id = Followship.following_id)'), 'introduction'],
					[sequelize.literal('(SELECT avatar FROM Users WHERE Users.id = Followship.following_id)'), 'avatar'],
					[sequelize.literal(`EXISTS(SELECT true FROM Followships WHERE Followships.follower_id = ${getUser(req).id} AND Followships.following_id = Followship.following_id)`), 'Following']
				]
			},
			order: [['createdAt', 'DESC']],
			raw: true
		})
			.then((followingList) => {
				res.status(200).json(followingList)
			})
			.catch(err => { next(err) })
	},
	getUserFollower: (req, res, next) => {
		Followship.findAll({
			where: { followingId: req.params.id },
			attributes: {
				include: [
					[sequelize.literal('(SELECT id FROM Users WHERE Users.id = Followship.follower_id)'), 'id'],
					[sequelize.literal('(SELECT account FROM Users WHERE Users.id = Followship.follower_id)'), 'account'],
					[sequelize.literal('(SELECT name FROM Users WHERE Users.id = Followship.follower_id)'), 'name'],
					[sequelize.literal('(SELECT introduction FROM Users WHERE Users.id = Followship.follower_id)'), 'introduction'],
					[sequelize.literal('(SELECT avatar FROM Users WHERE Users.id = Followship.follower_id)'), 'avatar'],
					[sequelize.literal(`EXISTS(SELECT true FROM Followships WHERE Followships.follower_id = ${getUser(req).id} AND Followships.following_id = Followship.follower_id)`), 'Following']
				]
			},
			order: [['createdAt', 'DESC']],
			raw: true
		})
			.then((followingList) => {
				res.status(200).json(followingList)
			})
			.catch(err => { next(err) })
	},
	getUserlikes: (req, res, next) => {
		const id = req.params.id
		Like.findAll({
			where: { UserId: id },
			include: {
				model: Tweet,
				attributes: {
					include: [
						[sequelize.literal('(SELECT COUNT(id) FROM Likes WHERE Likes.tweet_id = Tweet.id)'), 'LikeCount'],
						[sequelize.literal('(SELECT COUNT(id) FROM Replies WHERE Replies.tweet_id = Tweet.id)'), 'ReplyCount'],
						[sequelize.literal(`(SELECT COUNT(id) FROM Likes WHERE Likes.tweet_id = Tweet.id AND user_id = ${getUser(req).id})`), 'isLiked'],
					]
				},
				include: [{
					model: User,
					attributes:
						['id', 'name', 'account', 'avatar'],
				}],
			},
			order: [['createdAt', 'DESC']],
			nest: true,
			raw: true
		})
			.then((likeList) => {
				res.status(200).json(likeList)
			})
			.catch(err => { next(err) })
	},
	getUserTweets: (req, res, next) => {
		const currentUser = getUser(req).id
		const id = req.params.id
		Promise.all([
			Tweet.findAll({
				where: { UserId: id },
				include: {
					model: User,
					attributes: ['id', 'account', 'avatar', 'name']
				},
				order: [['createdAt', 'DESC']],
				nest: true,
				raw: true
			}),
			Like.findAll({
				attributes: ['id', 'TweetId', 'UserId'],
				raw: true
			}),
			Reply.findAll({
				attributes: ['id', 'TweetId'],
				raw: true
			},
			)
		])
			.then(([tweetList, likedata, reply]) => {
				for (let i = 0; i < tweetList.length; i++) {
					tweetList[i].likeCount = 0
					tweetList[i].replyCount = 0
					tweetList[i].liked = false
					for (let k = 0; k < likedata.length; k++) {
						if (likedata[k].TweetId === tweetList[i].id) {
							tweetList[i].likeCount++
						}
						if (likedata[k].UserId === currentUser && likedata[k].TweetId === tweetList[i].id) {
							tweetList[i].liked = true
						}
					}
					for (let r = 0; r < reply.length; r++) {
						if (reply[r].TweetId === tweetList[i].id) {
							tweetList[i].replyCount++
						}
					}
				}
				const tweetListOrder = tweetList.sort(function (a, b) {
					return a.createdAt > b.createdAt
				})

				res.status(200).json(tweetListOrder)
			})
			.catch(err => { next(err) })
	},
	getUserRepliedTweets: (req, res, next) => {
		const id = req.params.id
		Reply.findAll({
			where: { UserId: id },
			include: {
				model: Tweet,
				attributes:
					['id'],
				include: [{
					model: User,
					attributes:
						['id', 'name', 'account', 'avatar'],
				}],
			},
			order: [['createdAt', 'DESC']],
			nest: true,
			raw: true

		})
			.then((replyList) => {
				res.status(200).json(replyList)
			})
			.catch(err => { next(err) })
	},
	getTopUser: (req, res, next) => {
		const queryUser = `SELECT * ,(SELECT COUNT(id) FROM Followships WHERE Followships.follower_id = ${getUser(req).id} AND Followships.following_id = Users.id) AS isFollowing FROM Users ORDER BY (following_count *1) DESC LIMIT 0,10`
		sequelize.query(queryUser)
			.then((replyList) => {
				replyList[0].map((r) => { delete r.password })
				const topUsers = replyList[0].filter(ru => ru.role === 'user')
				res.status(200).json(topUsers)
			})
			.catch(err => { next(err) })
	},
	getCurrentUser: (req, res, next) => {
		User.findByPk(getUser(req).id)
			.then((user) => {
				delete user.get({ plain: true }).password
				res.status(200).json({ status: '200', message: 'JWT success', user })
			})
			.catch(err => { next(err) })
	},
	getCurrentAdmin: (req, res, next) => {
		User.findByPk(getUser(req).id)
			.then((admin) => {
				delete admin.get({ plain: true }).password
				res.status(200).json({ status: '200', message: 'JWT success', admin })
			})
			.catch(err => { next(err) })
	}
}

module.exports = userController
