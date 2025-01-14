'use strict'
const faker = require('faker')
const bcrypt = require('bcryptjs')
module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.bulkInsert('Users', [{
			account: 'root',
			email: 'root@example.com',
			password: await bcrypt.hash('12345678', 10),
			name: 'root',
			avatar: `https://loremflickr.com/140/140/people/?random=${Math.random() * 100}`,
			introduction: faker.lorem.text().substring(0,160),
			cover: 'https://loremflickr.com/639/200/image',
			role: 'admin',
			following_count: 0,
			created_at: new Date(),
			updated_at: new Date()
		}, {
			account: 'user1',
			email: 'user1@example.com',
			password: await bcrypt.hash('12345678', 10),
			name: 'user1',
			avatar: `https://loremflickr.com/140/140/people/?random=${Math.random() * 100}`,
			introduction: faker.lorem.text().substring(0,160),
			cover: `https://loremflickr.com/639/200/image/?random=${Math.random() * 100}`,
			role: 'user',
			following_count: 0,
			created_at: new Date(),
			updated_at: new Date()

    }], {})
  },
  down: async (queryInterface, Sequelize) => {
    const { sequelize } = queryInterface
    try {
      await sequelize.transaction(async transaction => {
        const options = { transaction }
        await sequelize.query('TRUNCATE TABLE Users', options)
      })
    } catch (error) {
      console.log(error)
    }
  }
}
