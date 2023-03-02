require('dotenv').config()
const exec = require('child_process').exec
const NodeHelper = require('node_helper')
const { Configuration, OpenAIApi } = require("openai")
const API_KEY = process.env.OPENAI_API_KEY
const ORGANIZATION = process.env.OPENAI_ORGANIZATION

const configuration = new Configuration({
  organization: ORGANIZATION,
  apiKey: API_KEY,
})

const openai = new OpenAIApi(configuration)

module.exports = NodeHelper.create({
  start: function () {
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'REQUEST') {
      this.job(payload).catch((error) => {
        console.log(error)
      })
    }
    if (notification == "SHELL_EXEC") {
      console.log("[OPENAI] shellExec trying:", payload)
      exec(payload, (error, stdout, stderr)=>{
        if (error) {
          console.log("[OPENAI] shellExec error:\n ------ \n", error, "\n ----- \n")
        }
        if (stderr) console.log("[OPENAI] shellExec stdErr:\n ------ \n", stderr, "\n ----- \n")
        console.log("[OPENAI] shellExec stdOut:\n ------ \n", stdout, "\n ----- \n")
      })
    }
  },

  job: async function (payload) {
    const jobMap = {
      'IMAGE': 'createImage',
      'TEXT': 'createCompletion',
      'CHAT': 'createChatCompletion'
    }
    let e = null
    let {request, options} = payload
    let response = null
    try {
      response = await openai[jobMap[options.method]](request)
    } catch (error) {
      console.log('error')
      console.log(error)
      e = error
    } finally {
      let r = {
        error: e,
        response: response?.data ?? e,
        request: request,
        options: options,
        responseTimestamp: Date.now(),
        stealth: options.stealth,
      }
      this.sendSocketNotification('RESPONSE', r)
    }
  }
})