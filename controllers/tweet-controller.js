const { User, Tweet, Like, sequelize } = require('../models')
const helpers = require('../_helpers')

const tweetController = {
  getTweet: async (req, res, next) => {
    try {
      const tweetId = req.params.id
      const currentUserId = helpers.getUser(req).id
      const tweet = await Tweet.findByPk(tweetId, {
        nest: true,
        raw: true,
        include:
          { model: User, attributes: ['id', 'account', 'name', 'avatar', 'cover'] },
        attributes: [
          'id', 'description', 'createdAt',
          [sequelize.literal('(SELECT COUNT(id) FROM Replies WHERE Replies.tweet_id = Tweet.id)'), 'replyCount'],
          [sequelize.literal('(SELECT COUNT(id) FROM Likes WHERE Likes.tweet_id = Tweet.id)'), 'LikeCount'],
          [sequelize.literal(`EXISTS (SELECT id FROM Likes WHERE Likes.tweet_id = Tweet.id AND Likes.user_id = ${currentUserId})`), 'ifLiked']
        ],
        order: [['createdAt', 'DESC']]
      })
      return res.status(200).json({ tweet })
    } catch (err) { next(err) }
  },
  // getTweetReplies: (req, res, next) => {
  //   const id = req.params.id
  //   const tweet = Tweet.findByPk(id)
  //   if (!tweet) {
  //     console.log(id)
  //     return res.status(404).json({ status: 'error', message: 'tweet did not exist!' })
  //   }
  //   Reply.findAll({
  //     nest: true,
  //     raw: true,
  //     where: { tweetId: id }
  //     // attributes: ['id', 'comment', 'createdAt'],
  //     // order: [['createdAt', 'DESC']],        
  //     // include: {
  //     //   model: User
  //     //   attributes: ['id', 'account', 'name', 'avatar']
  //     // }        
  //   }).then(replyList => {
  //     console.log(replyList.tweetId)
  //     return res.status(200).json(replies)
  //   })
  //     .catch(err => next(err))
  // },
  // postTweetReply: (req, res, next) => {
  //   const { comment } = req.body
  //   const tweetId = req.params.id
  //   const currentUserId = helpers.getUser(req).id
  //   if (!comment) throw Error('content is required!', {}, Error.prototype.code = 401)
  //   if (comment.length > 140) throw Error('too many words!', {}, Error.prototype.code = 401)
  //   Reply.create({
  //     UserId: currentUserId,
  //     TweetId: tweetId,
  //     comment
  //   })
  //     .then(reply => {
  //       res.status(200).json(reply)
  //     })
  //     .catch(err => next(err))
  // },
  getTweets: async (req, res, next) => {
    try {
      const currentUserId = helpers.getUser(req).id
      const tweets = await Tweet.findAll({
        nest: true,
        raw: true,
        include: { model: User, attributes: ['id', 'account', 'name', 'avatar', 'cover'] },
        attributes: [
          'id', 'description', 'createdAt',
          [sequelize.literal('(SELECT COUNT(id) FROM Replies WHERE Replies.tweet_id = Tweet.id)'), 'replyCount'],
          [sequelize.literal('(SELECT COUNT(id) FROM Likes WHERE Likes.tweet_id = Tweet.id)'), 'LikeCount'],
          [sequelize.literal(`EXISTS (SELECT id FROM Likes WHERE Likes.tweet_id = Tweet.id AND Likes.user_id = ${currentUserId})`), 'ifLiked']
        ],
        order: [['createdAt', 'DESC']]
      })
      return res.status(200).json(tweets)
    } catch (err) {
      next(err)
    }
  },
  postTweets: (req, res, next) => {
    const currentUserId = helpers.getUser(req).id
    const { description } = req.body
    if (!description) throw Error('content is required!', {}, Error.prototype.code = 401)
    if (description.length > 140) throw Error('too many words!', {}, Error.prototype.code = 401)
    Tweet.create({
      UserId: currentUserId,
      description
    })
      .then(tweet => {
        res.status(200).json(tweet)
      })
      .catch(err => next(err))
  },
  likeTweet: async (req, res, next) => {
    try {
      console.log(req.params)
      const tweetId = req.params.id
      const tweet = await Tweet.findByPk(tweetId)
      const like = await Like.finOne({
        where: {
          UserId: helpers.getUser(req).id,
          tweetId
        }
      })
      if (!tweet) {
        return res.status(401).json({
          status: 'error',
          message: 'Tweet did not exist!'
        })
      }
      if (like) {
        return res.status(401).json({
          status: 'error',
          message: 'You have already liked this tweet!'
        })
      }
      Like.create({
        UserId: helpers.getUser(req).id,
        tweetId
      })
      return res.status(200).json(Like)
    } catch (err) {
      next(err)
    }
  }
}

module.exports = tweetController