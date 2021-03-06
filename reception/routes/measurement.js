
module.exports = (producer, redis) => {
  const express = require('express')
  const router = express.Router()

  const { sendMeasurementMessage, sendHealthCheck, eventBegun } = require('../tools')(producer)

  const { SENSOR_SECRET_TOKEN } = require('../config')

  const getMeasurementType = (sensorId, channel) => redis.get(`${sensorId}-${channel}`)

  const getMessageValue = (message) => {
    return Number(String(message).substr(2, 6)) / 100
  }
  const getchannel = (message) => {
    return String(message).substr(1, 1)
  }

  router.post('/', async (req, res, next) => {
    const { body, headers: { authorization } } = req

    if (authorization !== SENSOR_SECRET_TOKEN) res.sendStatus(401)
    else {
      const { sensorId, value, timestamp } = body
      const ts = timestamp * 1000000000

      try {
        if (Number(value) === 0) await sendHealthCheck(sensorId, ts)
        else if (String(value).substr(0, 1) === '9' && String(value).substr(1, 1) === '1') {
          await eventBegun(sensorId, ts)
        } else {
          const messagePart1 = String(value).substr(0, 6)
          const messagePart2 = String(value).substr(7, 12)

          const valM1 = getMessageValue(messagePart1)
          const channelM1 = getchannel(messagePart1)
          const measurementTypeM1 = await getMeasurementType(sensorId, channelM1)
          if (measurementTypeM1) await sendMeasurementMessage(sensorId, measurementTypeM1, valM1, ts)

          if (messagePart1 !== messagePart2) {
            const valM2 = getMessageValue(messagePart2)
            const channelM2 = getchannel(messagePart2)
            const measurementTypeM2 = await getMeasurementType(sensorId, channelM2)
            await sendMeasurementMessage(sensorId, measurementTypeM2, valM2, ts)
          }
        }
        res.sendStatus(200)
      } catch (e) {
        console.log(e)
        res.status(400).send(e.message)
      }
    }
  })

  return router
}
