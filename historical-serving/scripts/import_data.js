require('dotenv').config()
const fs = require('fs')
const { SENSOR_SECRET_TOKEN } = require('../config')
const csv = require('fast-csv')
const http = require('http')
const fileNames = ['4D10B3', '4D10B4']
const ENTRY_SENSOR_ID = '4D10B3'
const EXIT_SENSOR_ID = '4D10B4'

const getDataFromFile = (fileName) => {
  return new Promise((resolve, reject) => {
    let allData = []
    fs.createReadStream(`${fileName}.csv`)
      .pipe(csv())
      .on('data', function (data) {
        data[0] = Number(data[0])
        data[1] = Number(data[1])
        data[2] = Number(data[2])
        data[3] = Number(data[3])
        data[4] = fileName === '4D10B3' ? '4D10B3' : '4D10B4'
        allData.push(data)
      })
      .on('end', function () {
        resolve(allData)
      })
      .on('error', (e) => {
        reject(e)
      })
  })
}
// // [inicio, fin, ajuste Entrada, ajuste salida  ]
// const events = [
//   [ 1494578400, 1494605700, 0.95, 0.4 ],
//   [ 1494857340, 1494929940, 0.95, 0.45 ],
//   [ 1495012500, 1495029000, 1, 1.35 ],
//   [ 1496922300, 1496965500, 0.32, 1.33 ]
// ]
// [inicio, fin, ajuste Entrada, ajuste salida  ]
const events = [
  [ 1494578400, 1494605700, 0.95, 0.4 ]
]

// const future = 31536000 157.253.238.216
// 157.253.211.233

let future = 0

const postOptions = {
  hostname: '157.253.238.216',
  port: 8081,
  path: '/measurement',
  method: 'POST',
  headers: {
    'authorization': SENSOR_SECRET_TOKEN,
    'Content-Type': 'application/json'
  }
}
// const postOptions = {
//   hostname: 'localhost',
//   port: 4400,
//   path: '/measurement',
//   method: 'POST',
//   headers: {
//     'authorization': SENSOR_SECRET_TOKEN,
//     'Content-Type': 'application/json'
//   }
// }
const postData = (body) => {
  return new Promise((resolve, reject) => {
    const req = http.request(postOptions, (res) => {
      res.setEncoding('utf8')
    })
    req.on('error', (e) => {
      console.error(`problem with post request: ${e.message}`)
      reject(e.message)
    })
    req.on('response', (e) => {
      // console.log("Status Code",e.statusCode);
      resolve(e.statusCode)
    })
    req.write(body)
    req.end()
  })
}

const buildPostBody = (sensorId, value, timestamp) => {
  return JSON.stringify({
    'measurementType': 'level',
    'sensorId': sensorId,
    'value': value,
    'timestamp': timestamp + future
  })
}

const postEventData = async (event) => {
  let inicio = true
  let entry = await getDataFromFile(fileNames[0])
  let exit = await getDataFromFile(fileNames[1])

  let entryEventData = entry.filter((row) => {
    return (row[0] >= event[0] && row[0] <= event[1])
  })
  let exitEventData = exit.filter((row) => {
    return (row[0] >= event[0] && row[0] <= event[1])
  })

  entryEventData = entryEventData.map((row) => {
    row[3] = row[3] * event[2]
    return row
  })

  exitEventData = exitEventData.map((row) => {
    row[3] = row[3] * event[3]
    return row
  })

  let allData = entryEventData.concat(exitEventData).sort((a, b) => {
    if (a[0] < b[0]) {
      return -1
    } else if (a[0] > b[0]) {
      return 1
    } else {
      return 0
    }
  })
  // Math.ceil(allData.length / 8)
  console.log('dd')
  for (let index = 0; index < allData.length; index++) {
    const row = allData[index]
    // row[4] // sensorId
    const valueLevel = String(Math.trunc(row[3] * 100)).padStart(4, '0')
    const valueRain = String(Math.trunc(row[3] * 10)).padStart(4, '0')
    const valueConductivity = String(Math.trunc(row[1] < 0 ? 0 : row[1] * 100)).padStart(4, '0')
    const codedValue = `11${valueConductivity}10${valueLevel}`
    const codedValueRain = `11${valueRain}11${valueRain}`
    // row[0] + 18000 // to convert to UTC (input data is in colombian time)
    // const body = buildPostBody(row[4], row[3], row[0] + 18000)
    if (inicio) {
      const body = buildPostBody('4D10B5', '910910910910910',row[0] + 18000 )
      await hola3(body)
      inicio = false
    }
    // await postData(body)
    console.log("codedValue ",codedValue)
    console.log("codedValueRain ",codedValueRain)
    const body = buildPostBody(row[4], codedValue, row[0] + 18000)
    const bodyRain = buildPostBody('4D10B5', codedValueRain, row[0] + 18000)
    await hola2(body)
    await hola2(bodyRain)
  }
}
const hola2 = (body) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      await postData(body)
      resolve()
    }, 1000)
  })
}
const hola3 = (body) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      await postData(body)
      resolve(console.log("envio inicio"))
    }, 2000)
  })
}

const loadEvents = async () => {
  for (let index = 0; index < events.length; index++) {
    const event = events[index]
    await postEventData(event).catch((e) => {})
    console.log('End Evento')
  }
}
loadEvents()
