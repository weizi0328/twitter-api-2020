const express = require('express')
const router = express.Router()
const tweetController = require('../../controllers/tweet-controller')

const { authenticated } = require('../../middleware/auth')

// router.get('/tweets/:id/replies', authenticated, tweetController.getTweetReplies)
// router.post('/tweets/:id/replies', authenticated, tweetController.postTweetReply)
router.post('/:id/like', authenticated, tweetController.likeTweet)
router.post('/:id/unlike', authenticated, tweetController.unlikeTweet)
router.get('/:id', authenticated, tweetController.getTweet)
router.get('/', authenticated, tweetController.getTweets)
router.post('/', authenticated, tweetController.postTweets)

module.exports = router