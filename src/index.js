const { Configuration, OpenAIApi } = require("openai")

class PromptPipe {
  constructor(prompt) {
    this.prompt = prompt
    this.queue = []
    console.debug(`Initialized with prompt: "${prompt}"`)
  }

  

  async callApi(content) {
    console.debug(`Calling API with content: "${content}"`)
    try {
      const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
      })
      const openai = new OpenAIApi(configuration)
  
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content }],
        temperature: 0,
      })
  
      console.debug(`API response: "${completion.data.choices[0].message.content}"`)
      return completion.data.choices[0].message.content
    } catch (error) {
      console.error(`Error calling API with content "${content}":`, error)
      throw error
    }
  }

  map(templates) {
    this.queue.push(async (input) => {
      console.debug(`Mapping with templates: ${JSON.stringify(templates)}`)
      const results = []
      for (const template of templates) {
        const content = input + ' ' + template
        try {
          const result = await this.callApi(content)
          results.push(result)
        } catch (error) {
          console.error(`Error in map function with template "${template}":`, error)
        }
      }
      return results
    })
    return this
  }

  mapBefore(templates) {
    this.queue.push(async (input) => {
      console.debug(`Mapping with templates: ${JSON.stringify(templates)}`)
      const results = []
      for (const template of templates) {
        const content = template + ' ' + input
        try {
          const result = await this.callApi(content)
          results.push(result)
        } catch (error) {
          console.error(`Error in map function with template "${template}":`, error)
        }
      }
      return results
    })
    return this
  }


  filter(condition) {
    this.queue.push(async (input) => {
      console.debug(`Filtering with condition: "${condition}"`)
      const results = []
      for (const item of input) {
        const content = `${item}\n\n--------\n\nis the below premises true for the above text? reply with only yes or no\n\n--------\n\n${condition}\n\n--------\n\nreply: `
        try {
          const result = await this.callApi(content)
          if (result.trim().toLowerCase() === "yes" || result.trim().toLowerCase() === "yes.") {
            results.push(item)
          }
        } catch (error) {
          console.error(`Error in filter function with condition "${condition}":`, error)
        }
      }
      return results
    })
    return this
  }

  reduce(operation) {
    this.queue.push(async (input) => {
      console.debug(`Reducing with operation: "${operation}"`)
      const content = `reduce all below text as a${operation}\n\n--------\n\n${input.join("\n\n--------\n\n")}`
      try {
        const result = await this.callApi(content)
        return result
      } catch (error) {
        console.error(`Error in reduce function with operation "${operation}":`, error)
      }
    })
    return this
  }

  async execute() {
    console.debug("Executing PromptPipe...")
    let data = this.prompt
    for (const fn of this.queue) {
      try {
        data = await fn(data)
      } catch (error) {
        console.error("Error executing function in queue:", error)
      }
    }
    console.debug("PromptPipe execution complete.")
    return data
  }
}

// module.exports = {
//   PromptPipe,
// }

// const { PromptPipe } = require("./prompt-pipe")

new PromptPipe("nietzsche thoughts about")
  .map(["apples", "cats", "magnets", "orange juice"])
  .filter("mentions any fruit")
  .reduce("twitter post")
  .execute()
  .then(console.log)
  // result:
  // No record of Nietzsche's thoughts on apples.
  // His works focused on the human condition, morality, and existence.
  // No mention of oranges either. #philosophy #Nietzsche #fruitthoughts

  