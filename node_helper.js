require('dotenv').config()
const NodeHelper = require('node_helper')
const { Configuration, OpenAIApi } = require("openai")
const API_KEY = process.env.OPENAI_API_KEY
const ORGANIZATION = process.env.OPENAI_ORGANIZATION

const configuration = new Configuration({
  organization: ORGANIZATION,
  apiKey: API_KEY,
})

console.log(configuration)
const openai = new OpenAIApi(configuration)

module.exports = NodeHelper.create({
  start: function () {
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'REQUEST') {
      this.job(payload).catch((error) => {
        console.log('oops')
      })
    }
  },

  job: async function (payload) {
    let status = false
    let e = null
    let now = new Date()

    let {request, options} = payload
    let response = null

    console.log(request, options)

    try {
      response = (options?.method === 'IMAGE') ?
        await openai.createImage(request) :
        await openai.createCompletion(request)
      console.log('response')
      console.log(response?.status, response?.statusText, response.data)
    } catch (error) {
      console.log('error')
      console.log(error)
      e = error
    } finally {
      this.sendSocketNotification('RESPONSE', {
        error: e,
        response: response.data,
        request: request,
        options: options,
        responseTimestamp: Date.now()
      })
    }

    

/*

    if (!this.lastRequestTime || ((this.lastRequestTime?.valueOf() ?? 0) + this.requestDelay < now.valueOf())) {
      try {
        const response = await openai.createImage({
          n: payload.n, 
          prompt:payload.prompt, 
          size: payload.size,
          response_format: payload.response_format
        })
        this.sendSocketNotification('RESPONSE', {
          image: response.data.data[0].b64_json,
          prompt: payload.prompt,
          id: payload.id,
          notiKey: payload.notiKey
        })
        this.lastRequestTime = new Date()
        status = true
      } catch (error) {
        e = error
        if (error.response) {
          console.log('[DALLE] Error; Response Status:', error.response.status)
          console.log('[DALLE] Error; Response Data', error.response.data)
        } else {
          console.log('[DALLE] Error; Response Message', error.message)
        }
      }
    } else {
      e = '[DALLE] Too frequent request. This request would be ignored.'
      console.warn(e)
    }
    if (!status) this.sendSocketNotification('RESPONSE', {
      error: e,
      prompt: payload.prompt,
      id: payload.id,
      notiKey: payload.notiKey
    })
*/
  }
})