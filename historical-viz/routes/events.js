const express = require('express')
const router = express.Router()

const EventLogic = require('../logic/event')

const measurementLogic = require('./../logic/measurement')

const EVENT_PAGINATION = 3
const TIME_INTERVAL_MINUTES = "5m"
const AGGREGATION_FUNCTION = "max"
const ENTRY_SENSOR_ID = "entrada"
const EXIT_SENSOR_ID = "salida"
const MEASUREMENT = "level"

router.get('/', async (req, res, next) => {
  const { pageNumber} = req.query
  const numberOfEvents = await EventLogic.numberOfEvents()
  const numberOfPages = Math.trunc(numberOfEvents/EVENT_PAGINATION) + (numberOfEvents%EVENT_PAGINATION >0? 1: 0)
  try {
    if ( pageNumber && (pageNumber>numberOfPages || pageNumber<0) ) throw new Error("Pagina fuera de rango")
    else {
      const firstEventPage = pageNumber? (pageNumber-1)*EVENT_PAGINATION : 0
      const eventsInPage = pageNumber? ((pageNumber-1)*EVENT_PAGINATION+EVENT_PAGINATION > numberOfEvents? numberOfEvents-firstEventPage: EVENT_PAGINATION) : (numberOfEvents<EVENT_PAGINATION? numberOfEvents: EVENT_PAGINATION)

      const events = await EventLogic.findFinishedEvents(firstEventPage,eventsInPage)

      for (let index = 0; index < events.length; index++) {
        const entry = await measurementLogic.getMeasurements(MEASUREMENT, ENTRY_SENSOR_ID, events[index].startDate, events[index].finishDate, AGGREGATION_FUNCTION, TIME_INTERVAL_MINUTES)
        const exit = await measurementLogic.getMeasurements(MEASUREMENT, EXIT_SENSOR_ID, events[index].startDate, events[index].finishDate, AGGREGATION_FUNCTION , TIME_INTERVAL_MINUTES)       
        events[index]["entry"] = entry
        events[index]["exit"] = exit
      }
      res.send(events)
    }
  } catch (e) {
    res.status(400).send(e.message)
  }
})

module.exports = router
